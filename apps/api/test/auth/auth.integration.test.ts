import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { api } from "../helpers/app.helper";
import {
	bearer,
	createUserWithSession,
	extractRefreshCookie,
	login
} from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createUser, DEFAULT_PASSWORD } from "../helpers/factories.helper";
import {
	clearOutbox,
	extractTokenFromMail,
	findLastMailTo,
	waitForMailTo
} from "../helpers/mail.helper";

const NEW_PASSWORD = "N3wPassw0rd!";
const UNKNOWN_ONE_TIME_TOKEN = "a".repeat(64);

useTestDatabase();

function registerPayload(suffix: string) {
	return {
		username: `reg_${suffix}`,
		email: `reg_${suffix}@completr.test`,
		password: DEFAULT_PASSWORD,
		name: `Registered ${suffix}`
	};
}

void describe("POST /auth/register", () => {
	void it("lets an admin register a user and starts a session for it", async () => {
		const admin = await createUserWithSession("admin");

		const response = await api()
			.post("/auth/register")
			.set("Authorization", admin.authorization)
			.send(registerPayload("ok"));

		assert.equal(response.status, 201);
		assert.equal(response.body.data.user.username, "reg_ok");
		assert.equal(response.body.data.user.role, "user");
		assert.equal(response.body.data.user.email, undefined);
		assert.ok(response.body.data.access_token);
		assert.ok(response.body.data.session_id);
		extractRefreshCookie(response.headers["set-cookie"]);
	});

	void it("rejects a non-admin with 403 AUTH_FORBIDDEN", async () => {
		const user = await createUserWithSession("premium");

		const response = await api()
			.post("/auth/register")
			.set("Authorization", user.authorization)
			.send(registerPayload("forbidden"));

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "AUTH_FORBIDDEN");
	});

	void it("rejects an invalid access token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.post("/auth/register")
			.set("Authorization", bearer("not-a-jwt"))
			.send(registerPayload("badtoken"));

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});

	void it("rejects a missing Authorization header with 422 AUTH_SCHEMA_INVALID", async () => {
		const response = await api()
			.post("/auth/register")
			.send(registerPayload("noheader"));

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});

	void it("rejects an invalid body with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");

		const response = await api()
			.post("/auth/register")
			.set("Authorization", admin.authorization)
			.send({ ...registerPayload("weak"), password: "weak" });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		assert.ok(
			response.body.issues.some(
				(issue: { path: string }) => issue.path === "password"
			)
		);
	});

	void it("rejects a taken email with 409 AUTH_USER_ALREADY_EXISTS", async () => {
		const admin = await createUserWithSession("admin");
		const existing = await createUser();

		const response = await api()
			.post("/auth/register")
			.set("Authorization", admin.authorization)
			.send({ ...registerPayload("taken"), email: existing.email });

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "AUTH_USER_ALREADY_EXISTS");
	});
});

void describe("invitations", () => {
	beforeEach(clearOutbox);

	async function inviteByMail(email: string) {
		const admin = await createUserWithSession("admin");
		const response = await api()
			.post("/admin/invitations")
			.set("Authorization", admin.authorization)
			.send({ email });
		assert.equal(response.status, 201);
		return extractTokenFromMail(await waitForMailTo(email));
	}

	void it("sends an invitation mail and lets the invitee create an account", async () => {
		const email = "invitee@completr.test";
		const token = await inviteByMail(email);

		const preview = await api().get(`/invitations/${token}`);
		assert.equal(preview.status, 200);
		assert.equal(preview.body.data.invitation.email, email);

		const accepted = await api().post("/invitations/accept").send({
			token,
			username: "invitee",
			name: "Invited User",
			password: DEFAULT_PASSWORD
		});
		assert.equal(accepted.status, 201);
		assert.equal(accepted.body.data.user.username, "invitee");
		assert.ok(accepted.body.data.access_token);
		extractRefreshCookie(accepted.headers["set-cookie"]);

		await login(email);
	});

	void it("rejects a used invitation token with 404 INVITATION_INVALID_TOKEN", async () => {
		const email = "reused@completr.test";
		const token = await inviteByMail(email);
		const payload = {
			token,
			username: "reused",
			name: "Reused Token",
			password: DEFAULT_PASSWORD
		};
		await api().post("/invitations/accept").send(payload).expect(201);

		const response = await api()
			.post("/invitations/accept")
			.send({ ...payload, username: "reused2" });

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "INVITATION_INVALID_TOKEN");
	});

	void it("rejects inviting a registered email with 409 INVITATION_EMAIL_REGISTERED", async () => {
		const admin = await createUserWithSession("admin");
		const existing = await createUser();

		const response = await api()
			.post("/admin/invitations")
			.set("Authorization", admin.authorization)
			.send({ email: existing.email });

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "INVITATION_EMAIL_REGISTERED");
		assert.equal(findLastMailTo(existing.email), undefined);
	});

	void it("hides the admin route from non-admins with 404 AUTH_ROUTE_NOT_FOUND", async () => {
		const user = await createUserWithSession("moderator");

		const response = await api()
			.post("/admin/invitations")
			.set("Authorization", user.authorization)
			.send({ email: "hidden@completr.test" });

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
	});
});

void describe("POST /auth/login", () => {
	void it("returns an access token and sets an HttpOnly refresh cookie", async () => {
		const user = await createUser();

		const response = await api()
			.post("/auth/login")
			.send({ email: user.email, password: DEFAULT_PASSWORD });

		assert.equal(response.status, 200);
		assert.ok(response.body.data.access_token);
		assert.ok(response.body.data.session_id);
		const cookie = extractRefreshCookie(response.headers["set-cookie"]);
		assert.match(cookie, /HttpOnly/);
		assert.match(cookie, /Path=\/auth/);

		const me = await api()
			.get("/users/me")
			.set("Authorization", bearer(response.body.data.access_token));
		assert.equal(me.status, 200);
		assert.equal(me.body.data.user.id, user.id);
	});

	void it("rejects a wrong password with 401 AUTH_INVALID_CREDENTIALS", async () => {
		const user = await createUser();

		const response = await api()
			.post("/auth/login")
			.send({ email: user.email, password: "Wr0ngPass!" });

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_CREDENTIALS");
	});

	void it("rejects an unknown email with 401 AUTH_INVALID_CREDENTIALS", async () => {
		const response = await api().post("/auth/login").send({
			email: "nobody@completr.test",
			password: DEFAULT_PASSWORD
		});

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_CREDENTIALS");
	});

	void it("rejects a deactivated account with 401 AUTH_INVALID_CREDENTIALS", async () => {
		const user = await createUser({ isActive: false });

		const response = await api()
			.post("/auth/login")
			.send({ email: user.email, password: DEFAULT_PASSWORD });

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_CREDENTIALS");
	});

	void it("rejects an invalid body with 422 COMMON_SCHEMA_INVALID", async () => {
		const response = await api()
			.post("/auth/login")
			.send({ email: "not-an-email", password: DEFAULT_PASSWORD });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});
});

void describe("POST /auth/refresh", () => {
	void it("rotates the refresh token read from the cookie", async () => {
		const user = await createUser();
		const session = await login(user.email);

		const response = await api()
			.post("/auth/refresh")
			.set("Cookie", session.refreshCookie);

		assert.equal(response.status, 200);
		assert.ok(response.body.data.access_token);
		const rotatedCookie = extractRefreshCookie(
			response.headers["set-cookie"]
		);
		assert.notEqual(rotatedCookie, session.refreshCookie);

		const reused = await api()
			.post("/auth/refresh")
			.set("Cookie", session.refreshCookie);
		assert.equal(reused.status, 401);
		assert.equal(reused.body.type, "AUTH_INVALID_REFRESH_TOKEN");
	});

	void it("accepts the refresh token in the body", async () => {
		const user = await createUser();
		const session = await login(user.email);

		const response = await api()
			.post("/auth/refresh")
			.send({ refresh_token: session.refreshToken });

		assert.equal(response.status, 200);
		assert.ok(response.body.data.access_token);
	});

	void it("rejects a request without refresh token with 401 AUTH_INVALID_REFRESH_TOKEN", async () => {
		const response = await api().post("/auth/refresh");

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_REFRESH_TOKEN");
	});

	void it("rejects an unknown refresh token with 401 AUTH_INVALID_REFRESH_TOKEN", async () => {
		const response = await api()
			.post("/auth/refresh")
			.send({ refresh_token: "unknown-token" });

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_REFRESH_TOKEN");
	});
});

void describe("POST /auth/logout", () => {
	void it("revokes the session and clears the refresh cookie", async () => {
		const user = await createUser();
		const session = await login(user.email);

		const response = await api()
			.post("/auth/logout")
			.set("Cookie", session.refreshCookie);

		assert.equal(response.status, 204);
		const cleared = extractRefreshCookie(response.headers["set-cookie"]);
		assert.match(cleared, /^refresh_token=;/);

		const refreshed = await api()
			.post("/auth/refresh")
			.send({ refresh_token: session.refreshToken });
		assert.equal(refreshed.status, 401);
	});

	void it("answers 204 even without a refresh token", async () => {
		const response = await api().post("/auth/logout");

		assert.equal(response.status, 204);
	});
});

void describe("PATCH /auth/password", () => {
	void it("changes the password and revokes every session", async () => {
		const { user, session, authorization } = await createUserWithSession();

		const response = await api()
			.patch("/auth/password")
			.set("Authorization", authorization)
			.send({ password: NEW_PASSWORD });

		assert.equal(response.status, 204);
		await login(user.email, NEW_PASSWORD);
		const refreshed = await api()
			.post("/auth/refresh")
			.send({ refresh_token: session.refreshToken });
		assert.equal(refreshed.status, 401);
	});

	void it("rejects a password that breaks the policy with 422", async () => {
		const { authorization } = await createUserWithSession();

		const response = await api()
			.patch("/auth/password")
			.set("Authorization", authorization)
			.send({ password: "alllowercase1!" });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});
});

void describe("password reset", () => {
	beforeEach(clearOutbox);

	async function requestResetToken(email: string) {
		await api().post("/auth/forgot-password").send({ email }).expect(204);
		return extractTokenFromMail(await waitForMailTo(email));
	}

	void it("mails a reset link that sets a new password and revokes sessions", async () => {
		const user = await createUser();
		const session = await login(user.email);
		const token = await requestResetToken(user.email);

		const response = await api()
			.post("/auth/reset-password")
			.send({ token, password: NEW_PASSWORD });

		assert.equal(response.status, 204);
		await login(user.email, NEW_PASSWORD);
		const oldPassword = await api()
			.post("/auth/login")
			.send({ email: user.email, password: DEFAULT_PASSWORD });
		assert.equal(oldPassword.status, 401);
		const refreshed = await api()
			.post("/auth/refresh")
			.send({ refresh_token: session.refreshToken });
		assert.equal(refreshed.status, 401);
	});

	void it("answers 204 for an unknown email without sending mail", async () => {
		const email = "ghost@completr.test";

		const response = await api()
			.post("/auth/forgot-password")
			.send({ email });

		assert.equal(response.status, 204);
		await assert.rejects(waitForMailTo(email));
	});

	void it("rejects a used token with 400 AUTH_INVALID_PASSWORD_RESET_TOKEN", async () => {
		const user = await createUser();
		const token = await requestResetToken(user.email);
		await api()
			.post("/auth/reset-password")
			.send({ token, password: NEW_PASSWORD })
			.expect(204);

		const response = await api()
			.post("/auth/reset-password")
			.send({ token, password: DEFAULT_PASSWORD });

		assert.equal(response.status, 400);
		assert.equal(response.body.type, "AUTH_INVALID_PASSWORD_RESET_TOKEN");
	});

	void it("rejects an unknown token with 400 AUTH_INVALID_PASSWORD_RESET_TOKEN", async () => {
		const response = await api()
			.post("/auth/reset-password")
			.send({ token: UNKNOWN_ONE_TIME_TOKEN, password: NEW_PASSWORD });

		assert.equal(response.status, 400);
		assert.equal(response.body.type, "AUTH_INVALID_PASSWORD_RESET_TOKEN");
	});

	void it("rejects a malformed token with 422 COMMON_SCHEMA_INVALID", async () => {
		const response = await api()
			.post("/auth/reset-password")
			.send({ token: "short", password: NEW_PASSWORD });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});
});
