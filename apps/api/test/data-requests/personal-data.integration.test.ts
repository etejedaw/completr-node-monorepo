import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { QueryTypes } from "sequelize";

import { Activity } from "../../src/activity/activity.model";
import { AuditLog } from "../../src/audit/audit.model";
import { RefreshToken } from "../../src/auth/refresh-token.model";
import { Backlog } from "../../src/backlog/backlog.model";
import { DataRequest } from "../../src/data-requests/data-request.model";
import { sequelize } from "../../src/database/sequelize.database";
import { UserInvitation } from "../../src/invitations/user-invitation.model";
import { ListFollower } from "../../src/list-followers/list-follower.model";
import { List } from "../../src/lists/list.model";
import { User } from "../../src/users/user.model";
import { type UserRole } from "../../src/users/user-role.type";
import { api } from "../helpers/app.helper";
import { bearer, createUserWithSession, login } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";
import { createUser } from "../helpers/factories.helper";
import {
	AI_RECAP_TEXT,
	PRIVATE_BACKLOG_NOTE,
	seedPersonalData
} from "./personal-data.fixture";

useTestDatabase();

const NON_ADMIN_ROLES: UserRole[] = ["user", "premium", "moderator"];
const EXPORT_FILENAME =
	/^attachment; filename="completr-data-(.+)-\d{4}-\d{2}-\d{2}\.json"$/;

function auditEntry(action: string, targetId: string) {
	return eventually(async () => {
		const entry = await AuditLog.findOne({ where: { action, targetId } });
		assert.ok(entry, `no audit entry ${action} for ${targetId}`);
		return entry;
	});
}

async function countRowsReferencingUser(userId: string) {
	const foreignKeys = await sequelize.query<{
		tableName: string;
		columnName: string;
	}>(
		`SELECT cl.relname AS "tableName", a.attname AS "columnName"
		FROM pg_constraint c
		JOIN pg_class cl ON cl.oid = c.conrelid
		JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
		WHERE c.contype = 'f' AND c.confrelid = '"Users"'::regclass`,
		{ type: QueryTypes.SELECT }
	);
	const counts: Record<string, number> = {};
	for (const { tableName, columnName } of foreignKeys) {
		const [row] = await sequelize.query<{ total: number }>(
			`SELECT COUNT(*)::int AS total FROM "${tableName}" WHERE "${columnName}" = :userId`,
			{ replacements: { userId }, type: QueryTypes.SELECT }
		);
		counts[`${tableName}.${columnName}`] = row!.total;
	}
	return counts;
}

async function seededUserWithSession() {
	const owner = await createUser();
	const seeded = await seedPersonalData(owner);
	const session = await login(owner.email);
	return { owner, seeded, session };
}

void describe("GET /admin/users/:userId/data-export", () => {
	void it("downloads every section of the user's data as a JSON attachment", async () => {
		const admin = await createUserWithSession("admin");
		const { owner, seeded } = await seededUserWithSession();

		const response = await api()
			.get(`/admin/users/${owner.id}/data-export`)
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 200);
		assert.equal(
			EXPORT_FILENAME.exec(
				String(response.headers["content-disposition"])
			)?.[1],
			owner.username
		);
		const body = response.body;
		assert.equal(body.meta.formatVersion, "1.0");
		assert.equal(body.meta.controller.contactEmail, "completr@etejeda.dev");
		assert.ok(body.meta.purposes.length > 0);
		assert.ok(
			body.meta.recipients.some(
				(recipient: { name: string }) => recipient.name === "DeepSeek"
			)
		);
		assert.ok(body.meta.retention.accountAndContent);
		assert.ok(body.meta.dataSource);

		assert.equal(body.account.email, owner.email);
		assert.equal(body.privacySettings.profileVisibility, "public");
		assert.equal(body.premium.grants.length, 1);
		assert.equal(body.backlog.length, 1);
		assert.deepEqual(body.backlog[0].game, {
			id: seeded.game.id,
			title: "Cozy Grove",
			slug: seeded.game.code
		});
		assert.equal(body.backlog[0].notes, PRIVATE_BACKLOG_NOTE);
		assert.equal(body.backlog[0].progress[0].note, "Reached chapter 3");
		assert.deepEqual(body.backlog[0].coopPartners, [
			seeded.partner.username
		]);
		assert.equal(body.queue.length, 1);
		assert.equal(body.gameShelf.length, 1);
		assert.equal(body.wishlist[0].game.title, "Wished Game");
		assert.equal(body.favorites.length, 1);
		assert.equal(body.lists[0].name, "Comfort games");
		assert.equal(body.lists[0].items[0].game.id, seeded.game.id);
		assert.deepEqual(
			body.followedLists.map((list: { owner: string }) => list.owner),
			[seeded.partner.username]
		);
		assert.equal(body.savedViews[0].name, "Short games");
		assert.equal(body.reviews[0].content, "Lovely");
		assert.deepEqual(
			body.social.followers.map(
				(follow: { username: string }) => follow.username
			),
			[seeded.partner.username]
		);
		assert.deepEqual(
			body.social.following.map(
				(follow: { username: string }) => follow.username
			),
			[seeded.partner.username]
		);
		assert.deepEqual(body.social.followRequests, [
			{
				direction: "received",
				username: seeded.requester.username,
				createdAt: body.social.followRequests[0].createdAt
			}
		]);
		assert.equal(body.activity.length, 1);
		assert.equal(body.activity[0].game.id, seeded.game.id);
		assert.equal(body.moodTags.tags[0].description, "Rainy days");
		assert.equal(body.moodTags.gameTags[0].game.slug, seeded.game.code);
		assert.equal(
			body.trackedFranchises[0].franchise.name,
			seeded.franchise.name
		);
		assert.equal(body.platinums[0].notes, "Finally");
		assert.equal(body.rewinds[0].aiRecap.text, AI_RECAP_TEXT);
		assert.equal(body.rewinds[0].premiumStats.longestStreakDays, 12);
		assert.equal(body.sessions.length, 1);
		assert.deepEqual(Object.keys(body.sessions[0]).sort(), [
			"createdAt",
			"deviceInfo",
			"expiresAt",
			"lastUsedAt"
		]);
		assert.equal(body.gameReports[0].message, "Wrong duration");
		assert.equal(body.dataRequests.length, 1);
		await auditEntry("user_data_exported", owner.id);
	});

	void it("never includes the password hash or session tokens", async () => {
		const admin = await createUserWithSession("admin");
		const { owner, session } = await seededUserWithSession();
		const storedTokens = await RefreshToken.findAll({
			where: { userId: owner.id }
		});
		const storedUser = await User.findByPk(owner.id);

		const response = await api()
			.get(`/admin/users/${owner.id}/data-export`)
			.set("Authorization", admin.authorization)
			.expect(200);

		const raw = JSON.stringify(response.body);
		assert.equal(raw.includes(storedUser!.password), false);
		assert.equal(raw.includes(session.refreshToken), false);
		for (const token of storedTokens) {
			assert.equal(raw.includes(token.token), false);
		}
		assert.equal("password" in response.body.account, false);
	});

	void it("answers 404 USER_NOT_FOUND for an unknown user", async () => {
		const admin = await createUserWithSession("admin");

		const response = await api()
			.get(
				"/admin/users/00000000-0000-4000-8000-000000000000/data-export"
			)
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "USER_NOT_FOUND");
	});

	for (const role of NON_ADMIN_ROLES) {
		void it(`hides the route from ${role}`, async () => {
			const { authorization } = await createUserWithSession(role);
			const owner = await createUser();

			const response = await api()
				.get(`/admin/users/${owner.id}/data-export`)
				.set("Authorization", authorization);

			assert.equal(response.status, 404);
		});
	}
});

void describe("DELETE /admin/users/:userId", () => {
	void it("deletes the account and every row that references it", async () => {
		const admin = await createUserWithSession("admin");
		const { owner, seeded } = await seededUserWithSession();

		const response = await api()
			.delete(`/admin/users/${owner.id}`)
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 204);
		assert.equal(await User.count({ where: { id: owner.id } }), 0);
		const leftovers = await countRowsReferencingUser(owner.id);
		assert.deepEqual(
			Object.entries(leftovers).filter(([, total]) => total > 0),
			[]
		);
		assert.equal(
			await Activity.count({
				where: { id: seeded.partnerActivityAboutOwner.id }
			}),
			0
		);
		assert.equal(
			await UserInvitation.count({ where: { email: owner.email } }),
			0
		);
		assert.equal(await List.count({ where: { userId: owner.id } }), 0);
		await auditEntry("user_deleted", owner.id);
	});

	void it("keeps the data of other users intact", async () => {
		const admin = await createUserWithSession("admin");
		const { owner, seeded } = await seededUserWithSession();

		await api()
			.delete(`/admin/users/${owner.id}`)
			.set("Authorization", admin.authorization)
			.expect(204);

		assert.ok(await User.findByPk(seeded.partner.id));
		assert.ok(await Backlog.findByPk(seeded.partnerBacklog.id));
		assert.ok(await List.findByPk(seeded.partnerList.id));
		assert.ok(await Activity.findByPk(seeded.partnerUnrelatedActivity.id));
		assert.equal(
			await ListFollower.count({ where: { listId: seeded.ownList.id } }),
			0
		);
	});

	void it("keeps the data requests as an anonymous record", async () => {
		const admin = await createUserWithSession("admin");
		const { owner } = await seededUserWithSession();
		const [request] = await DataRequest.findAll({
			where: { userId: owner.id }
		});

		await api()
			.delete(`/admin/users/${owner.id}`)
			.set("Authorization", admin.authorization)
			.expect(204);

		const kept = await DataRequest.findByPk(request!.id);
		assert.ok(kept);
		assert.equal(kept.userId, null);
	});

	void it("refuses to delete an admin account", async () => {
		const admin = await createUserWithSession("admin");
		const otherAdmin = await createUser({ role: "admin" });

		const response = await api()
			.delete(`/admin/users/${otherAdmin.id}`)
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "USER_DELETE_FORBIDDEN");
		assert.ok(await User.findByPk(otherAdmin.id));
	});

	void it("refuses to let an admin delete their own account", async () => {
		const admin = await createUserWithSession("admin");

		const response = await api()
			.delete(`/admin/users/${admin.user.id}`)
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "USER_DELETE_FORBIDDEN");
	});

	void it("refuses to delete an account that left audit history", async () => {
		const admin = await createUserWithSession("admin");
		const demotedAdmin = await createUser();
		await AuditLog.create({
			userId: demotedAdmin.id,
			action: "user_edited",
			targetType: "user",
			targetId: admin.user.id
		});

		const response = await api()
			.delete(`/admin/users/${demotedAdmin.id}`)
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "USER_DELETE_FORBIDDEN");
		assert.ok(await User.findByPk(demotedAdmin.id));
	});

	void it("answers 404 USER_NOT_FOUND for an unknown user", async () => {
		const admin = await createUserWithSession("admin");

		const response = await api()
			.delete("/admin/users/00000000-0000-4000-8000-000000000000")
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "USER_NOT_FOUND");
	});

	void it("signs the deleted user out", async () => {
		const admin = await createUserWithSession("admin");
		const { owner, session } = await seededUserWithSession();

		await api()
			.delete(`/admin/users/${owner.id}`)
			.set("Authorization", admin.authorization)
			.expect(204);

		const response = await api()
			.get("/users/me")
			.set("Authorization", bearer(session.accessToken));
		assert.equal(response.status, 401);
	});

	for (const role of NON_ADMIN_ROLES) {
		void it(`hides the route from ${role}`, async () => {
			const { authorization } = await createUserWithSession(role);
			const owner = await createUser();

			const response = await api()
				.delete(`/admin/users/${owner.id}`)
				.set("Authorization", authorization);

			assert.equal(response.status, 404);
			assert.ok(await User.findByPk(owner.id));
		});
	}
});
