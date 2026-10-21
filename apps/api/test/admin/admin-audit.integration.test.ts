import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { AuditLog } from "../../src/audit/audit.model";
import { type UserRole } from "../../src/users/user-role.type";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";
import { createGame, createUser } from "../helpers/factories.helper";

useTestDatabase();

const NON_ADMIN_ROLES: UserRole[] = ["user", "premium", "moderator"];

function uniqueLabel(prefix: string) {
	return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 10)}`;
}

interface AuditLogBody {
	id: string;
	user: { id: string; username: string; name: string };
	action: string;
	targetType: string;
	targetId: string;
	target: {
		type: string;
		id: string;
		label: string;
		code?: string;
		username?: string;
	};
	createdAt: string;
}

function getAudit(
	authorization: string,
	query: Record<string, string | number> = {}
) {
	return api()
		.get("/admin/audit")
		.query(query)
		.set("Authorization", authorization);
}

void describe("GET /admin/audit", () => {
	void it("lists entries with the actor and the resolved game target", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame({ title: "Audited Game" });
		const action = uniqueLabel("game_probe");
		await AuditLog.create({
			userId: admin.user.id,
			action,
			targetType: "game",
			targetId: game.id
		});

		const response = await getAudit(admin.authorization, { action });

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, 1);
		const [log] = response.body.data.logs as AuditLogBody[];
		assert.equal(log!.action, action);
		assert.equal(log!.targetType, "game");
		assert.equal(log!.targetId, game.id);
		assert.deepEqual(log!.user, {
			id: admin.user.id,
			username: admin.user.username,
			name: admin.user.name
		});
		assert.deepEqual(log!.target, {
			type: "game",
			id: game.id,
			label: "Audited Game",
			code: game.code
		});
		assert.ok(log!.createdAt);
	});

	void it("resolves a user target to its name and username", async () => {
		const admin = await createUserWithSession("admin");
		const target = await createUser();
		const action = uniqueLabel("user_probe");
		await AuditLog.create({
			userId: admin.user.id,
			action,
			targetType: "user",
			targetId: target.id
		});

		const response = await getAudit(admin.authorization, { action });

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.logs[0].target, {
			type: "user",
			id: target.id,
			label: target.name,
			username: target.username
		});
	});

	void it("falls back to the raw id for targets of any other type", async () => {
		const admin = await createUserWithSession("admin");
		const action = uniqueLabel("other_probe");
		const targetId = randomUUID();
		await AuditLog.create({
			userId: admin.user.id,
			action,
			targetType: "invitation",
			targetId
		});

		const response = await getAudit(admin.authorization, { action });

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.logs[0].target, {
			type: "invitation",
			id: targetId,
			label: targetId
		});
	});

	void it("falls back to the target id when the game or user no longer exists", async () => {
		const admin = await createUserWithSession("admin");
		const action = uniqueLabel("ghost_probe");
		const ghostGameId = randomUUID();
		const ghostUserId = randomUUID();
		await AuditLog.bulkCreate([
			{
				userId: admin.user.id,
				action,
				targetType: "game",
				targetId: ghostGameId
			},
			{
				userId: admin.user.id,
				action,
				targetType: "user",
				targetId: ghostUserId
			}
		]);

		const response = await getAudit(admin.authorization, { action });

		assert.equal(response.status, 200);
		const labels = (response.body.data.logs as AuditLogBody[])
			.map(log => log.target.label)
			.sort();
		assert.deepEqual(labels, [ghostGameId, ghostUserId].sort());
	});

	void it("filters by action and by target type", async () => {
		const admin = await createUserWithSession("admin");
		const action = uniqueLabel("filter_action");
		const targetType = uniqueLabel("filter_type");
		await AuditLog.bulkCreate([
			{
				userId: admin.user.id,
				action,
				targetType,
				targetId: randomUUID()
			},
			{
				userId: admin.user.id,
				action,
				targetType: "job",
				targetId: randomUUID()
			},
			{
				userId: admin.user.id,
				action: uniqueLabel("other_action"),
				targetType,
				targetId: randomUUID()
			}
		]);

		const byAction = await getAudit(admin.authorization, { action });
		assert.equal(byAction.body.data.total, 2);

		const byType = await getAudit(admin.authorization, { targetType });
		assert.equal(byType.body.data.total, 2);

		const byBoth = await getAudit(admin.authorization, {
			action,
			targetType
		});
		assert.equal(byBoth.body.data.total, 1);
		assert.equal(byBoth.body.data.logs[0].action, action);
		assert.equal(byBoth.body.data.logs[0].targetType, targetType);
	});

	void it("returns an empty page for a filter without matches", async () => {
		const admin = await createUserWithSession("admin");

		const response = await getAudit(admin.authorization, {
			action: uniqueLabel("never_recorded")
		});

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.logs, []);
		assert.equal(response.body.data.total, 0);
	});

	void it("orders entries from newest to oldest and paginates", async () => {
		const admin = await createUserWithSession("admin");
		const action = uniqueLabel("order_probe");
		const now = Date.now();
		const entries = await Promise.all(
			[0, 1, 2].map(index =>
				AuditLog.create({
					userId: admin.user.id,
					action,
					targetType: "job",
					targetId: randomUUID(),
					createdAt: new Date(now - index * 60_000)
				})
			)
		);

		const firstPage = await getAudit(admin.authorization, {
			action,
			limit: 2
		});
		assert.equal(firstPage.body.data.total, 3);
		assert.deepEqual(
			(firstPage.body.data.logs as AuditLogBody[]).map(log => log.id),
			[entries[0]!.id, entries[1]!.id]
		);

		const secondPage = await getAudit(admin.authorization, {
			action,
			limit: 2,
			offset: 2
		});
		assert.deepEqual(
			(secondPage.body.data.logs as AuditLogBody[]).map(log => log.id),
			[entries[2]!.id]
		);
	});

	void it("shows the entry left by an admin action", async () => {
		const admin = await createUserWithSession("admin");
		const target = await createUser();

		await api()
			.patch(`/admin/users/${target.id}`)
			.set("Authorization", admin.authorization)
			.send({ name: "Audited Rename" })
			.expect(200);

		const log = await eventually(async () => {
			const response = await getAudit(admin.authorization, {
				action: "user_edited"
			});
			const found = (response.body.data.logs as AuditLogBody[]).find(
				entry => entry.targetId === target.id
			);
			assert.ok(found);
			return found;
		});
		assert.equal(log.user.id, admin.user.id);
		assert.equal(log.target.type, "user");
		assert.equal(log.target.username, target.username);
	});

	void it("rejects an out of range limit with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");

		for (const limit of [0, 101]) {
			const response = await getAudit(admin.authorization, { limit });
			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
	});

	void it("rejects a negative offset with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");

		const response = await getAudit(admin.authorization, { offset: -1 });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	void it("rejects an unknown query parameter with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");

		const response = await getAudit(admin.authorization, { userId: "x" });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	for (const role of NON_ADMIN_ROLES) {
		void it(`hides the route from a ${role} with 404 AUTH_ROUTE_NOT_FOUND`, async () => {
			const account = await createUserWithSession(role);

			const response = await getAudit(account.authorization);

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
		});
	}

	void it("hides the route from an anonymous caller with 404 AUTH_ROUTE_NOT_FOUND", async () => {
		const response = await api().get("/admin/audit");

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
	});
});
