import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import * as authService from "../../src/auth/auth.service";
import * as passwordService from "../../src/auth/services/password.service";
import * as passwordResetService from "../../src/auth/services/password-reset.service";
import * as tokenService from "../../src/auth/services/token.service";
import { InMemoryMailModel } from "../../src/mail/in-memory/in-memory.provider";
import * as usersService from "../../src/users/users.service";
import { asModel } from "../unit-helpers/as-model";
import { captureRejection, stub } from "../unit-helpers/mocks";

const registerDto = {
	username: "player",
	email: "p@example.com",
	password: "Abcdef1!",
	name: "Player"
};

const activeUser = {
	id: "u-1",
	username: "player",
	email: "p@example.com",
	password: "stored-hash",
	isActive: true
};

function errorCode(error: unknown) {
	return (error as { code: string }).code;
}

function stubSessionIssuing() {
	const createRefreshToken = stub(
		tokenService,
		"createRefreshToken",
		async () => ({
			rawToken: "raw-refresh",
			sessionId: "session-1"
		})
	);
	const signAccessToken = stub(
		tokenService,
		"signAccessToken",
		() => "access-token"
	);
	return { createRefreshToken, signAccessToken };
}

void describe("authService.register", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("rejects an already registered email", async () => {
		stub(usersService, "findUserByEmail", async () => activeUser);
		stub(usersService, "findUserByUsername", async () => null);
		const createUser = stub(usersService, "createUser", async () => ({}));

		const error = await captureRejection(
			authService.register(registerDto as never)
		);

		assert.equal(errorCode(error), "AUTH_USER_ALREADY_EXISTS");
		assert.equal(createUser.mock.callCount(), 0);
	});

	void it("rejects an already registered username", async () => {
		stub(usersService, "findUserByEmail", async () => null);
		stub(usersService, "findUserByUsername", async () => activeUser);

		const error = await captureRejection(
			authService.register(registerDto as never)
		);

		assert.equal(errorCode(error), "AUTH_USER_ALREADY_EXISTS");
	});

	void it("stores the hashed password, never the plain one, and opens a session", async () => {
		stub(usersService, "findUserByEmail", async () => null);
		stub(usersService, "findUserByUsername", async () => null);
		stub(passwordService, "hashPassword", async () => "hashed");
		const createUser = stub(usersService, "createUser", async () =>
			asModel(activeUser)
		);
		const { createRefreshToken, signAccessToken } = stubSessionIssuing();

		const result = await authService.register(
			registerDto as never,
			"Firefox"
		);

		assert.equal(
			(createUser.mock.calls[0]?.arguments[0] as { password: string })
				.password,
			"hashed"
		);
		assert.deepEqual(createRefreshToken.mock.calls[0]?.arguments, [
			"u-1",
			"Firefox"
		]);
		assert.deepEqual(signAccessToken.mock.calls[0]?.arguments[0], {
			sub: "u-1",
			username: "player",
			email: "p@example.com",
			sid: "session-1"
		});
		assert.equal(result.accessToken, "access-token");
		assert.equal(result.refreshToken, "raw-refresh");
		assert.equal(result.sessionId, "session-1");
	});
});

void describe("authService.login", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("rejects an unknown email with the same error as a wrong password", async () => {
		stub(usersService, "findUserByEmail", async () => null);
		const unknown = await captureRejection(
			authService.login({ email: "x@y.z", password: "p" })
		);
		mock.restoreAll();

		stub(usersService, "findUserByEmail", async () => asModel(activeUser));
		stub(passwordService, "verifyPassword", async () => false);
		const wrongPassword = await captureRejection(
			authService.login({ email: "x@y.z", password: "p" })
		);

		assert.equal(errorCode(unknown), "AUTH_INVALID_CREDENTIALS");
		assert.equal(errorCode(wrongPassword), "AUTH_INVALID_CREDENTIALS");
	});

	void it("verifies the password against the stored hash and opens a session", async () => {
		stub(usersService, "findUserByEmail", async () => asModel(activeUser));
		const verify = stub(
			passwordService,
			"verifyPassword",
			async () => true
		);
		const { createRefreshToken } = stubSessionIssuing();

		const result = await authService.login(
			{ email: "p@example.com", password: "Abcdef1!" },
			"Chrome"
		);

		assert.deepEqual(verify.mock.calls[0]?.arguments, [
			"Abcdef1!",
			"stored-hash"
		]);
		assert.deepEqual(createRefreshToken.mock.calls[0]?.arguments, [
			"u-1",
			"Chrome"
		]);
		assert.equal(result.accessToken, "access-token");
		assert.equal("user" in result, false);
	});
});

void describe("authService.refresh", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("rejects an unknown or expired refresh token", async () => {
		stub(tokenService, "verifyRefreshToken", async () => null);

		const error = await captureRejection(authService.refresh("raw"));

		assert.equal(errorCode(error), "AUTH_INVALID_REFRESH_TOKEN");
	});

	void it("rejects the token of a missing or deactivated user", async () => {
		stub(tokenService, "verifyRefreshToken", async () =>
			asModel({ userId: "u-1", deviceInfo: null })
		);
		stub(usersService, "findUserById", async () => null);
		const missing = await captureRejection(authService.refresh("raw"));
		mock.restoreAll();

		stub(tokenService, "verifyRefreshToken", async () =>
			asModel({ userId: "u-1", deviceInfo: null })
		);
		stub(usersService, "findUserById", async () =>
			asModel({ ...activeUser, isActive: false })
		);
		const deactivated = await captureRejection(authService.refresh("raw"));

		assert.equal(errorCode(missing), "AUTH_INVALID_REFRESH_TOKEN");
		assert.equal(errorCode(deactivated), "AUTH_INVALID_REFRESH_TOKEN");
	});

	void it("rotates the token: deletes the old one and issues a new session", async () => {
		stub(tokenService, "verifyRefreshToken", async () =>
			asModel({ userId: "u-1", deviceInfo: "Old device" })
		);
		stub(usersService, "findUserById", async () => asModel(activeUser));
		const deleteToken = stub(
			tokenService,
			"deleteRefreshToken",
			async () => undefined
		);
		const { createRefreshToken } = stubSessionIssuing();

		const result = await authService.refresh("old-raw");

		assert.deepEqual(deleteToken.mock.calls[0]?.arguments, ["old-raw"]);
		assert.equal(result.refreshToken, "raw-refresh");
		assert.deepEqual(createRefreshToken.mock.calls[0]?.arguments, [
			"u-1",
			"Old device"
		]);
	});

	void it("prefers the new device info over the stored one", async () => {
		stub(tokenService, "verifyRefreshToken", async () =>
			asModel({ userId: "u-1", deviceInfo: "Old device" })
		);
		stub(usersService, "findUserById", async () => asModel(activeUser));
		stub(tokenService, "deleteRefreshToken", async () => undefined);
		const { createRefreshToken } = stubSessionIssuing();

		await authService.refresh("old-raw", "New device");

		assert.deepEqual(createRefreshToken.mock.calls[0]?.arguments, [
			"u-1",
			"New device"
		]);
	});
});

void describe("authService.changePassword", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("stores the hash and revokes every session", async () => {
		stub(passwordService, "hashPassword", async () => "new-hash");
		const updatePassword = stub(
			usersService,
			"updatePassword",
			async () => undefined
		);
		const deleteAll = stub(
			tokenService,
			"deleteAllUserRefreshTokens",
			async () => undefined
		);

		assert.equal(await authService.changePassword("u-1", "Abcdef1!"), true);
		assert.deepEqual(updatePassword.mock.calls[0]?.arguments, [
			"u-1",
			"new-hash"
		]);
		assert.deepEqual(deleteAll.mock.calls[0]?.arguments, ["u-1"]);
	});
});

void describe("authService.revokeSession", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("fails with AUTH_INVALID_REFRESH_TOKEN when the session is not the user's", async () => {
		stub(tokenService, "deleteRefreshTokenById", async () => false);

		const error = await captureRejection(
			authService.revokeSession("s-1", "intruder")
		);

		assert.equal(errorCode(error), "AUTH_INVALID_REFRESH_TOKEN");
	});

	void it("revokes an owned session", async () => {
		const deleteById = stub(
			tokenService,
			"deleteRefreshTokenById",
			async () => true
		);

		await authService.revokeSession("s-1", "u-1");

		assert.deepEqual(deleteById.mock.calls[0]?.arguments, ["s-1", "u-1"]);
	});
});

void describe("authService.resetPassword", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("rejects an invalid, expired or already used token", async () => {
		stub(passwordResetService, "claimPasswordResetToken", async () => null);

		const error = await captureRejection(
			authService.resetPassword("raw", "Abcdef1!")
		);

		assert.equal(errorCode(error), "AUTH_INVALID_PASSWORD_RESET_TOKEN");
	});

	void it("rejects a valid token whose user no longer exists", async () => {
		stub(
			passwordResetService,
			"claimPasswordResetToken",
			async () => "u-1"
		);
		stub(usersService, "findUserById", async () => null);

		const error = await captureRejection(
			authService.resetPassword("raw", "Abcdef1!")
		);

		assert.equal(errorCode(error), "AUTH_INVALID_PASSWORD_RESET_TOKEN");
	});

	void it("changes the password and revokes all sessions of the claimed user", async () => {
		stub(
			passwordResetService,
			"claimPasswordResetToken",
			async () => "u-1"
		);
		stub(usersService, "findUserById", async () => asModel(activeUser));
		stub(passwordService, "hashPassword", async () => "new-hash");
		const updatePassword = stub(
			usersService,
			"updatePassword",
			async () => undefined
		);
		const deleteAll = stub(
			tokenService,
			"deleteAllUserRefreshTokens",
			async () => undefined
		);

		await authService.resetPassword("raw", "Abcdef1!");

		assert.deepEqual(updatePassword.mock.calls[0]?.arguments, [
			"u-1",
			"new-hash"
		]);
		assert.deepEqual(deleteAll.mock.calls[0]?.arguments, ["u-1"]);
	});
});

void describe("authService.requestPasswordReset", () => {
	beforeEach(() => {
		InMemoryMailModel.outbox.length = 0;
	});

	afterEach(() => {
		mock.restoreAll();
	});

	void it("sends a reset link with a fresh token to an existing user", async () => {
		stub(usersService, "findUserByEmail", async () => asModel(activeUser));
		stub(
			passwordResetService,
			"createPasswordResetToken",
			async () => "raw-reset"
		);

		authService.requestPasswordReset("p@example.com");
		await flushBackgroundWork();

		const [sentMail] = InMemoryMailModel.outbox;
		assert.equal(sentMail?.to, "p@example.com");
		assert.match(sentMail?.text ?? "", /token=raw-reset/);
	});

	void it("sends nothing when the user is in cooldown", async () => {
		stub(usersService, "findUserByEmail", async () => asModel(activeUser));
		stub(
			passwordResetService,
			"createPasswordResetToken",
			async () => null
		);

		authService.requestPasswordReset("p@example.com");
		await flushBackgroundWork();

		assert.equal(InMemoryMailModel.outbox.length, 0);
	});

	void it("sends nothing when the email does not belong to any user", async () => {
		stub(usersService, "findUserByEmail", async () => null);

		authService.requestPasswordReset("ghost@example.com");
		await flushBackgroundWork();

		assert.equal(InMemoryMailModel.outbox.length, 0);
	});
});

function flushBackgroundWork() {
	return new Promise(resolve => setImmediate(resolve));
}
