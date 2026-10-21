import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { invitationSerializer } from "../../src/invitations/invitations.serializer";
import { type UserInvitation } from "../../src/invitations/user-invitation.model";
import { asModel } from "../unit-helpers/as-model";

function buildInvitation(expiresAt: Date) {
	return asModel<UserInvitation>({
		id: "i-1",
		email: "friend@example.com",
		tokenHash: "secret-hash",
		createdAt: new Date("2024-01-01"),
		expiresAt
	});
}

void describe("invitationSerializer", () => {
	void it("flags an invitation in the past as expired", () => {
		const result = invitationSerializer(
			buildInvitation(new Date(Date.now() - 1000))
		);

		assert.equal(result.isExpired, true);
	});

	void it("keeps a future invitation as not expired", () => {
		const result = invitationSerializer(
			buildInvitation(new Date(Date.now() + 60_000))
		);

		assert.equal(result.isExpired, false);
	});

	void it("never exposes the token hash", () => {
		const result = invitationSerializer(buildInvitation(new Date()));

		assert.equal("tokenHash" in result, false);
		assert.deepEqual(Object.keys(result).sort(), [
			"createdAt",
			"email",
			"expiresAt",
			"id",
			"isExpired"
		]);
	});
});
