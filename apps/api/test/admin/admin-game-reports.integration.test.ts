import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { AuditLog } from "../../src/audit/audit.model";
import {
	GameReport,
	type ReportCategory
} from "../../src/game-reports/game-report.model";
import { type UserRole } from "../../src/users/user-role.type";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";
import { createGame, createUser } from "../helpers/factories.helper";

useTestDatabase();

const NON_STAFF_ROLES: UserRole[] = ["user", "premium"];
const STAFF_ROLES: UserRole[] = ["moderator", "admin"];

interface PendingReportBody {
	id: string;
	message: string;
	status: string;
	category: string;
	Game: { id: string; title: string; code: string };
	User: { id: string; username: string };
}

async function createReport(
	overrides: {
		status?: "pending" | "approved" | "rejected";
		category?: ReportCategory;
		createdAt?: Date;
	} = {}
) {
	const [game, reporter] = await Promise.all([createGame(), createUser()]);
	const report = await GameReport.create({
		gameId: game.id,
		userId: reporter.id,
		message: "The score is missing for this game",
		status: overrides.status ?? "pending",
		category: overrides.category ?? "missing_score",
		createdAt: overrides.createdAt
	});
	return { report, game, reporter };
}

function auditEntry(action: string, targetId: string) {
	return eventually(async () => {
		const entry = await AuditLog.findOne({ where: { action, targetId } });
		assert.ok(entry, `no audit entry ${action} for ${targetId}`);
		return entry;
	});
}

function pendingReportIds(authorization: string) {
	return api()
		.get("/admin/game-reports")
		.set("Authorization", authorization)
		.expect(200)
		.then(response =>
			(response.body.data.reports as PendingReportBody[]).map(
				report => report.id
			)
		);
}

void describe("GET /admin/game-reports", () => {
	for (const role of STAFF_ROLES) {
		void it(`lets a ${role} list pending reports with the game and the reporter`, async () => {
			const staff = await createUserWithSession(role);
			const { report, game, reporter } = await createReport();

			const response = await api()
				.get("/admin/game-reports")
				.set("Authorization", staff.authorization);

			assert.equal(response.status, 200);
			const listed = (
				response.body.data.reports as PendingReportBody[]
			).find(entry => entry.id === report.id);
			assert.ok(listed);
			assert.equal(listed.status, "pending");
			assert.equal(listed.category, "missing_score");
			assert.equal(listed.message, report.message);
			assert.deepEqual(listed.Game, {
				id: game.id,
				title: game.title,
				code: game.code
			});
			assert.deepEqual(listed.User, {
				id: reporter.id,
				username: reporter.username
			});
		});
	}

	void it("lists only pending reports, oldest first", async () => {
		const admin = await createUserWithSession("admin");
		const now = Date.now();
		const newer = await createReport({
			createdAt: new Date(now - 1_000)
		});
		const older = await createReport({
			createdAt: new Date(now - 60_000)
		});
		const approved = await createReport({ status: "approved" });
		const rejected = await createReport({ status: "rejected" });

		const ids = await pendingReportIds(admin.authorization);

		assert.ok(ids.indexOf(older.report.id) < ids.indexOf(newer.report.id));
		assert.equal(ids.includes(approved.report.id), false);
		assert.equal(ids.includes(rejected.report.id), false);
	});

	for (const role of NON_STAFF_ROLES) {
		void it(`hides the route from a ${role} with 404 AUTH_ROUTE_NOT_FOUND`, async () => {
			const account = await createUserWithSession(role);

			const response = await api()
				.get("/admin/game-reports")
				.set("Authorization", account.authorization);

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
		});
	}

	void it("hides the route from an anonymous caller with 404 AUTH_ROUTE_NOT_FOUND", async () => {
		const response = await api().get("/admin/game-reports");

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
	});
});

void describe("PATCH /admin/game-reports/:reportId", () => {
	for (const role of STAFF_ROLES) {
		for (const status of ["approved", "rejected"] as const) {
			void it(`lets a ${role} mark a report as ${status} and drops it from the pending list`, async () => {
				const staff = await createUserWithSession(role);
				const { report } = await createReport();

				const response = await api()
					.patch(`/admin/game-reports/${report.id}`)
					.set("Authorization", staff.authorization)
					.send({ status });

				assert.equal(response.status, 200);
				assert.equal(response.body.data.report.id, report.id);
				assert.equal(response.body.data.report.status, status);
				await report.reload();
				assert.equal(report.status, status);
				assert.equal(
					(await pendingReportIds(staff.authorization)).includes(
						report.id
					),
					false
				);
			});
		}
	}

	void it("records the review in the audit log with the chosen status", async () => {
		const moderator = await createUserWithSession("moderator");
		const { report } = await createReport();

		await api()
			.patch(`/admin/game-reports/${report.id}`)
			.set("Authorization", moderator.authorization)
			.send({ status: "approved" })
			.expect(200);

		const entry = await auditEntry("report_approved", report.id);
		assert.equal(entry.userId, moderator.user.id);
		assert.equal(entry.targetType, "report");
	});

	void it("answers 404 GAME_REPORT_NOT_FOUND for an unknown report", async () => {
		const moderator = await createUserWithSession("moderator");

		const response = await api()
			.patch(`/admin/game-reports/${randomUUID()}`)
			.set("Authorization", moderator.authorization)
			.send({ status: "approved" });

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_REPORT_NOT_FOUND");
	});

	void it("rejects a malformed report id with 422 COMMON_SCHEMA_INVALID", async () => {
		const moderator = await createUserWithSession("moderator");

		const response = await api()
			.patch("/admin/game-reports/not-a-uuid")
			.set("Authorization", moderator.authorization)
			.send({ status: "approved" });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	void it("rejects the pending status and unknown statuses with 422", async () => {
		const moderator = await createUserWithSession("moderator");
		const { report } = await createReport();

		for (const status of ["pending", "resolved"]) {
			const response = await api()
				.patch(`/admin/game-reports/${report.id}`)
				.set("Authorization", moderator.authorization)
				.send({ status });
			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
		await report.reload();
		assert.equal(report.status, "pending");
	});

	void it("rejects a missing status and unknown fields with 422", async () => {
		const moderator = await createUserWithSession("moderator");
		const { report } = await createReport();

		const missing = await api()
			.patch(`/admin/game-reports/${report.id}`)
			.set("Authorization", moderator.authorization)
			.send({});
		assert.equal(missing.status, 422);

		const extra = await api()
			.patch(`/admin/game-reports/${report.id}`)
			.set("Authorization", moderator.authorization)
			.send({ status: "approved", message: "rewritten" });
		assert.equal(extra.status, 422);
		await report.reload();
		assert.equal(report.status, "pending");
	});

	for (const role of NON_STAFF_ROLES) {
		void it(`hides the route from a ${role} and keeps the report pending`, async () => {
			const account = await createUserWithSession(role);
			const { report } = await createReport();

			const response = await api()
				.patch(`/admin/game-reports/${report.id}`)
				.set("Authorization", account.authorization)
				.send({ status: "approved" });

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
			await report.reload();
			assert.equal(report.status, "pending");
		});
	}

	void it("hides the route from an anonymous caller and keeps the report pending", async () => {
		const { report } = await createReport();

		const response = await api()
			.patch(`/admin/game-reports/${report.id}`)
			.send({ status: "approved" });

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
		await report.reload();
		assert.equal(report.status, "pending");
	});
});
