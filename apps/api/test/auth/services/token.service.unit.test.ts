/// <reference types="node" />

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { afterEach, describe, it, mock } from "node:test";

import jwt from "jsonwebtoken";
import { Op } from "sequelize";

import { RefreshToken } from "../../../src/auth/refresh-token.model";
import * as tokenService from "../../../src/auth/services/token.service";
import { environmentConfig } from "../../../src/common/config/environment.config";
import { asModel } from "../../unit-helpers/as-model";
import { spy, stub } from "../../unit-helpers/mocks";

const payload = {
	sub: "u-1",
	username: "player",
	email: "p@example.com",
	sid: "s-1"
};

describe("access tokens", () => {
	it("signs a token that verifies back to the same payload", () => {
		const token = tokenService.signAccessToken(payload);

		const verified = tokenService.verifyAccessToken(token);

		assert.equal(verified.sub, "u-1");
		assert.equal(verified.sid, "s-1");
	});

	it("sets an expiry on the token", () => {
		const decoded = jwt.decode(tokenService.signAccessToken(payload)) as {
			exp: number;
			iat: number;
		};

		assert.ok(decoded.exp > decoded.iat);
	});

	it("rejects a token signed with another secret", () => {
		const forged = jwt.sign(payload, "another-secret");

		assert.throws(() => tokenService.verifyAccessToken(forged));
	});

	it("rejects an expired token", () => {
		const expired = jwt.sign(
			payload,
			environmentConfig.ACCESS_TOKEN_SECRET,
			{ expiresIn: -10 }
		);

		assert.throws(() => tokenService.verifyAccessToken(expired), {
			name: "TokenExpiredError"
		});
	});
});

describe("createRefreshToken", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	it("stores the SHA-256 hash of the raw token and returns the session id", async () => {
		const create = stub(RefreshToken, "create", async () => ({
			id: "session-7"
		}));

		const result = await tokenService.createRefreshToken("u-1", "Firefox");

		const stored = create.mock.calls[0]?.arguments[0] as {
			userId: string;
			token: string;
			deviceInfo: string | null;
			expiresAt: Date;
		};
		const expectedHash = crypto
			.createHash("sha256")
			.update(result.rawToken)
			.digest("hex");
		assert.equal(result.sessionId, "session-7");
		assert.equal(result.rawToken.length, 128);
		assert.equal(stored.token, expectedHash);
		assert.equal(stored.deviceInfo, "Firefox");
		assert.ok(stored.expiresAt.getTime() > Date.now());
	});

	it("stores a null device info when none is given", async () => {
		const create = stub(RefreshToken, "create", async () => ({ id: "s" }));

		await tokenService.createRefreshToken("u-1");

		assert.equal(
			(create.mock.calls[0]?.arguments[0] as { deviceInfo: unknown })
				.deviceInfo,
			null
		);
	});
});

describe("verifyRefreshToken", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	it("returns null for an unknown token", async () => {
		stub(RefreshToken, "findOne", async () => null);

		assert.equal(await tokenService.verifyRefreshToken("raw"), null);
	});

	it("looks the token up by its hash, never by the raw value", async () => {
		const findOne = stub(RefreshToken, "findOne", async () => null);

		await tokenService.verifyRefreshToken("raw");

		const where = (
			findOne.mock.calls[0]?.arguments[0] as { where: { token: string } }
		).where;
		assert.equal(
			where.token,
			crypto.createHash("sha256").update("raw").digest("hex")
		);
	});

	it("deletes and rejects an expired token", async () => {
		const destroy = spy();
		stub(RefreshToken, "findOne", async () =>
			asModel({ expiresAt: new Date(Date.now() - 1000), destroy })
		);

		assert.equal(await tokenService.verifyRefreshToken("raw"), null);
		assert.equal(destroy.mock.callCount(), 1);
	});

	it("returns a valid token", async () => {
		const stored = asModel<RefreshToken>({
			expiresAt: new Date(Date.now() + 60_000)
		});
		stub(RefreshToken, "findOne", async () => stored);

		assert.equal(await tokenService.verifyRefreshToken("raw"), stored);
	});
});

describe("touchSessionLastUsed", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	it("updates a session at most once per throttle window", async () => {
		const update = stub(RefreshToken, "update", async () => [1]);

		await tokenService.touchSessionLastUsed("throttled-session");
		await tokenService.touchSessionLastUsed("throttled-session");

		assert.equal(update.mock.callCount(), 1);
	});

	it("updates different sessions independently", async () => {
		const update = stub(RefreshToken, "update", async () => [1]);

		await tokenService.touchSessionLastUsed("session-a");
		await tokenService.touchSessionLastUsed("session-b");

		assert.equal(update.mock.callCount(), 2);
	});
});

describe("refresh token deletion", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	it("deletes by id scoped to the user and reports whether something was deleted", async () => {
		const destroy = stub(RefreshToken, "destroy", async () => 1);

		assert.equal(
			await tokenService.deleteRefreshTokenById("s-1", "u-1"),
			true
		);
		assert.deepEqual(destroy.mock.calls[0]?.arguments, [
			{ where: { id: "s-1", userId: "u-1" } }
		]);

		mock.restoreAll();
		stub(RefreshToken, "destroy", async () => 0);
		assert.equal(
			await tokenService.deleteRefreshTokenById("s-1", "intruder"),
			false
		);
	});

	it("keeps only the current session when revoking the others", async () => {
		const destroy = stub(RefreshToken, "destroy", async () => 3);

		const deleted = await tokenService.deleteOtherUserRefreshTokens(
			"u-1",
			"current"
		);

		assert.equal(deleted, 3);
		assert.deepEqual(destroy.mock.calls[0]?.arguments, [
			{ where: { userId: "u-1", id: { [Op.ne]: "current" } } }
		]);
	});

	it("deletes every session of the user", async () => {
		const destroy = stub(RefreshToken, "destroy", async () => 2);

		await tokenService.deleteAllUserRefreshTokens("u-1");

		assert.deepEqual(destroy.mock.calls[0]?.arguments, [
			{ where: { userId: "u-1" } }
		]);
	});
});
