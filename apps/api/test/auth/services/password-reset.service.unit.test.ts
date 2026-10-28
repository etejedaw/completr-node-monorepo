import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import { PasswordResetToken } from "../../../src/auth/password-reset-token.model";
import {
	claimPasswordResetToken,
	createPasswordResetToken
} from "../../../src/auth/services/password-reset.service";
import { environmentConfig } from "../../../src/common/config/environment.config";
import { hashOneTimeToken } from "../../../src/common/utils/one-time-token.util";
import { sequelize } from "../../../src/database/sequelize.database";
import { asModel } from "../../unit-helpers/as-model";
import { stub, stubTransaction } from "../../unit-helpers/mocks";

void describe("createPasswordResetToken", () => {
	beforeEach(() => {
		stubTransaction();
		stub(sequelize, "query", async () => []);
		stub(PasswordResetToken, "count", async () => 0);
	});

	afterEach(() => {
		mock.restoreAll();
	});

	void it("issues nothing and keeps the current token while the user is in cooldown", async () => {
		stub(PasswordResetToken, "count", async () => 1);
		const destroy = stub(PasswordResetToken, "destroy", async () => 1);
		const create = stub(PasswordResetToken, "create", async () => ({}));

		assert.equal(await createPasswordResetToken("u-1"), null);
		assert.equal(destroy.mock.callCount(), 0);
		assert.equal(create.mock.callCount(), 0);
	});

	void it("takes a per-user lock before checking the cooldown", async () => {
		const query = stub(sequelize, "query", async () => []);
		stub(PasswordResetToken, "destroy", async () => 0);
		stub(PasswordResetToken, "create", async () => ({}));

		await createPasswordResetToken("u-1");

		assert.match(
			String(query.mock.calls[0]?.arguments[0]),
			/advisory_xact_lock/
		);
	});

	void it("removes the previous tokens of the user before issuing a new one", async () => {
		const destroy = stub(PasswordResetToken, "destroy", async () => 1);
		stub(PasswordResetToken, "create", async () => ({}));

		await createPasswordResetToken("u-1");

		assert.deepEqual(destroy.mock.calls[0]?.arguments, [
			{ where: { userId: "u-1" }, transaction: { id: "tx" } }
		]);
	});

	void it("stores only the hash of the returned raw token with the configured expiry", async () => {
		stub(PasswordResetToken, "destroy", async () => 0);
		const create = stub(PasswordResetToken, "create", async () => ({}));
		const before = Date.now();

		const rawToken = (await createPasswordResetToken("u-1")) ?? "";

		const stored = create.mock.calls[0]?.arguments[0] as {
			userId: string;
			tokenHash: string;
			expiresAt: Date;
		};
		const ttlMs =
			environmentConfig.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60_000;
		assert.match(rawToken, /^[a-f0-9]{64}$/);
		assert.equal(stored.tokenHash, hashOneTimeToken(rawToken));
		assert.notEqual(stored.tokenHash, rawToken);
		assert.ok(stored.expiresAt.getTime() >= before + ttlMs);
		assert.ok(stored.expiresAt.getTime() <= Date.now() + ttlMs);
	});
});

void describe("claimPasswordResetToken", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("returns null for an unknown or expired token", async () => {
		stub(PasswordResetToken, "findOne", async () => null);
		const destroy = stub(PasswordResetToken, "destroy", async () => 0);

		assert.equal(await claimPasswordResetToken("a".repeat(64)), null);
		assert.equal(destroy.mock.callCount(), 0);
	});

	void it("looks the token up by hash", async () => {
		const findOne = stub(PasswordResetToken, "findOne", async () => null);
		const raw = "b".repeat(64);

		await claimPasswordResetToken(raw);

		const where = (
			findOne.mock.calls[0]?.arguments[0] as {
				where: { tokenHash: string };
			}
		).where;
		assert.equal(where.tokenHash, hashOneTimeToken(raw));
	});

	void it("returns null when another request already consumed the token", async () => {
		stub(PasswordResetToken, "findOne", async () =>
			asModel({ id: "t-1", userId: "u-1" })
		);
		const destroy = stub(PasswordResetToken, "destroy", async () => 0);

		assert.equal(await claimPasswordResetToken("a".repeat(64)), null);
		assert.equal(destroy.mock.callCount(), 1);
	});

	void it("consumes the token and every other token of the user", async () => {
		stub(PasswordResetToken, "findOne", async () =>
			asModel({ id: "t-1", userId: "u-1" })
		);
		const destroy = stub(PasswordResetToken, "destroy", async () => 1);

		const userId = await claimPasswordResetToken("a".repeat(64));

		assert.equal(userId, "u-1");
		assert.deepEqual(destroy.mock.calls[0]?.arguments, [
			{ where: { id: "t-1" } }
		]);
		assert.deepEqual(destroy.mock.calls[1]?.arguments, [
			{ where: { userId: "u-1" } }
		]);
	});
});
