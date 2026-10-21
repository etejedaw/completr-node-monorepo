import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { AuditLog } from "../../src/audit/audit.model";
import {
	generateOneTimeToken,
	hashOneTimeToken
} from "../../src/common/utils/one-time-token.util";
import { UserInvitation } from "../../src/invitations/user-invitation.model";
import { type UserRole } from "../../src/users/user-role.type";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";

useTestDatabase();

const NON_ADMIN_ROLES: UserRole[] = ["user", "premium", "moderator"];

async function createInvitation(invitedById: string | null = null) {
	const { rawToken, tokenHash } = generateOneTimeToken();
	const invitation = await UserInvitation.create({
		email: `invited_${randomUUID().replaceAll("-", "").slice(0, 10)}@completr.test`,
		tokenHash,
		invitedById,
		expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
	});
	return { invitation, rawToken };
}

function auditEntry(action: string, targetId: string) {
	return eventually(async () => {
		const entry = await AuditLog.findOne({ where: { action, targetId } });
		assert.ok(entry, `no audit entry ${action} for ${targetId}`);
		return entry;
	});
}

void describe("DELETE /admin/invitations/:invitationId", () => {
	void it("revokes a pending invitation so its link stops working", async () => {
		const admin = await createUserWithSession("admin");
		const { invitation, rawToken } = await createInvitation(admin.user.id);

		await api().get(`/invitations/${rawToken}`).expect(200);

		const response = await api()
			.delete(`/admin/invitations/${invitation.id}`)
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 204);
		assert.equal(
			await UserInvitation.count({ where: { id: invitation.id } }),
			0
		);

		const lookup = await api().get(`/invitations/${rawToken}`);
		assert.equal(lookup.status, 404);
		assert.equal(lookup.body.type, "INVITATION_INVALID_TOKEN");
	});

	void it("stops the revoked token from creating an account", async () => {
		const admin = await createUserWithSession("admin");
		const { invitation, rawToken } = await createInvitation(admin.user.id);

		await api()
			.delete(`/admin/invitations/${invitation.id}`)
			.set("Authorization", admin.authorization)
			.expect(204);

		const accept = await api().post("/invitations/accept").send({
			token: rawToken,
			username: "revoked.user",
			name: "Revoked User",
			password: "Passw0rd!"
		});
		assert.equal(accept.status, 404);
		assert.equal(accept.body.type, "INVITATION_INVALID_TOKEN");
	});

	void it("removes the invitation from the admin listing", async () => {
		const admin = await createUserWithSession("admin");
		const { invitation } = await createInvitation(admin.user.id);
		const { invitation: kept } = await createInvitation(admin.user.id);

		await api()
			.delete(`/admin/invitations/${invitation.id}`)
			.set("Authorization", admin.authorization)
			.expect(204);

		const listing = await api()
			.get("/admin/invitations")
			.set("Authorization", admin.authorization)
			.expect(200);
		const ids = (listing.body.data.invitations as { id: string }[]).map(
			entry => entry.id
		);
		assert.equal(ids.includes(invitation.id), false);
		assert.equal(ids.includes(kept.id), true);
	});

	void it("revokes an invitation that already expired", async () => {
		const admin = await createUserWithSession("admin");
		const { invitation } = await createInvitation(admin.user.id);
		await invitation.update({ expiresAt: new Date(Date.now() - 1_000) });

		const response = await api()
			.delete(`/admin/invitations/${invitation.id}`)
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 204);
		assert.equal(
			await UserInvitation.count({ where: { id: invitation.id } }),
			0
		);
	});

	void it("records the revocation in the audit log", async () => {
		const admin = await createUserWithSession("admin");
		const { invitation } = await createInvitation(admin.user.id);

		await api()
			.delete(`/admin/invitations/${invitation.id}`)
			.set("Authorization", admin.authorization)
			.expect(204);

		const entry = await auditEntry("invitation_revoked", invitation.id);
		assert.equal(entry.userId, admin.user.id);
		assert.equal(entry.targetType, "invitation");
	});

	void it("answers 404 INVITATION_NOT_FOUND for an unknown invitation", async () => {
		const admin = await createUserWithSession("admin");

		const response = await api()
			.delete(`/admin/invitations/${randomUUID()}`)
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "INVITATION_NOT_FOUND");
	});

	void it("answers 404 INVITATION_NOT_FOUND the second time the same invitation is revoked", async () => {
		const admin = await createUserWithSession("admin");
		const { invitation } = await createInvitation(admin.user.id);

		await api()
			.delete(`/admin/invitations/${invitation.id}`)
			.set("Authorization", admin.authorization)
			.expect(204);
		const second = await api()
			.delete(`/admin/invitations/${invitation.id}`)
			.set("Authorization", admin.authorization);

		assert.equal(second.status, 404);
		assert.equal(second.body.type, "INVITATION_NOT_FOUND");
	});

	void it("rejects a malformed invitation id with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");

		const response = await api()
			.delete("/admin/invitations/not-a-uuid")
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	for (const role of NON_ADMIN_ROLES) {
		void it(`hides the route from a ${role} and keeps the invitation`, async () => {
			const account = await createUserWithSession(role);
			const { invitation, rawToken } = await createInvitation();

			const response = await api()
				.delete(`/admin/invitations/${invitation.id}`)
				.set("Authorization", account.authorization);

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
			assert.equal(
				await UserInvitation.count({
					where: { tokenHash: hashOneTimeToken(rawToken) }
				}),
				1
			);
		});
	}

	void it("hides the route from an anonymous caller and keeps the invitation", async () => {
		const { invitation } = await createInvitation();

		const response = await api().delete(
			`/admin/invitations/${invitation.id}`
		);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
		assert.equal(
			await UserInvitation.count({ where: { id: invitation.id } }),
			1
		);
	});
});
