import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { generateOneTimeToken } from "../../src/common/utils/one-time-token.util";
import { UserInvitation } from "../../src/invitations/user-invitation.model";
import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { DEFAULT_PASSWORD } from "../helpers/factories.helper";

useTestDatabase();

const CONCURRENT_ACCEPTS = 5;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function uniqueSuffix() {
	return randomUUID().replaceAll("-", "").slice(0, 8);
}

async function createInvitation() {
	const { rawToken, tokenHash } = generateOneTimeToken();
	const email = `racing_${uniqueSuffix()}@completr.test`;
	await UserInvitation.create({
		email,
		tokenHash,
		invitedById: null,
		expiresAt: new Date(Date.now() + ONE_DAY_MS)
	});
	return { email, rawToken };
}

function accept(token: string, username: string) {
	return api().post("/invitations/accept").send({
		token,
		username,
		name: "Invited User",
		password: DEFAULT_PASSWORD
	});
}

void describe("POST /invitations/accept under concurrency", () => {
	void it("creates one account when the same invitation is accepted at once", async () => {
		const { email, rawToken } = await createInvitation();

		const responses = await Promise.all(
			Array.from({ length: CONCURRENT_ACCEPTS }, (_, index) =>
				accept(rawToken, `race${uniqueSuffix()}${index}`)
			)
		);

		assert.equal(
			responses.filter(response => response.status === 201).length,
			1
		);
		for (const response of responses.filter(
			response => response.status !== 201
		))
			assert.equal(response.body.type, "INVITATION_INVALID_TOKEN");
		assert.equal(await User.count({ where: { email } }), 1);
		assert.equal(await UserInvitation.count({ where: { email } }), 0);
	});

	void it("keeps the invitation usable when the chosen username is taken", async () => {
		const { rawToken } = await createInvitation();
		const taken = await createInvitation();
		const username = `taken${uniqueSuffix()}`;
		await accept(taken.rawToken, username).expect(201);

		const clash = await accept(rawToken, username);
		assert.equal(clash.status, 409);

		const retry = await accept(rawToken, `free${uniqueSuffix()}`);
		assert.equal(retry.status, 201);
	});

	void it("answers 404 for garbage tokens without touching any invitation", async () => {
		const { email } = await createInvitation();

		for (const token of ["nope", "", "g".repeat(64), "a".repeat(64)]) {
			const response = await accept(token, `junk${uniqueSuffix()}`);
			assert.ok([404, 422].includes(response.status));
		}
		assert.equal(await UserInvitation.count({ where: { email } }), 1);
	});
});
