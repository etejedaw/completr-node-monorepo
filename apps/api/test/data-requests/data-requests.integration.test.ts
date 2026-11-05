import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { AuditLog } from "../../src/audit/audit.model";
import { DataRequest } from "../../src/data-requests/data-request.model";
import { User } from "../../src/users/user.model";
import { type UserRole } from "../../src/users/user-role.type";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";
import { createUser } from "../helpers/factories.helper";
import { clearOutbox, findLastMailTo } from "../helpers/mail.helper";

useTestDatabase();

const DAY_MS = 24 * 60 * 60 * 1000;
const NOTIFY_EMAIL = "completr@etejeda.dev";
const NON_ADMIN_ROLES: UserRole[] = ["user", "premium", "moderator"];

function auditEntry(action: string, targetId: string) {
	return eventually(async () => {
		const entry = await AuditLog.findOne({ where: { action, targetId } });
		assert.ok(entry, `no audit entry ${action} for ${targetId}`);
		return entry;
	});
}

function resolvedExport(userId: string, resolvedDaysAgo: number) {
	const resolvedAt = new Date(Date.now() - resolvedDaysAgo * DAY_MS);
	return DataRequest.create({
		userId,
		type: "export",
		status: "completed",
		requestedAt: new Date(resolvedAt.getTime() - DAY_MS),
		resolvedAt
	});
}

beforeEach(() => {
	clearOutbox();
});

void describe("POST /users/me/data-requests", () => {
	void it("creates a pending request and notifies the admin", async () => {
		const { user, authorization } = await createUserWithSession();

		const response = await api()
			.post("/users/me/data-requests")
			.set("Authorization", authorization)
			.send({ type: "export" });

		assert.equal(response.status, 201);
		const { request } = response.body.data;
		assert.equal(request.type, "export");
		assert.equal(request.status, "pending");
		assert.equal(request.daysRemaining, 30);
		assert.equal(request.resolvedAt, null);
		assert.equal(request.downloadableUntil, null);
		assert.equal(request.resolutionNote, null);
		assert.equal(
			new Date(request.dueAt).getTime() -
				new Date(request.requestedAt).getTime(),
			30 * DAY_MS
		);
		const mail = findLastMailTo(NOTIFY_EMAIL);
		assert.ok(mail);
		assert.match(mail.subject, new RegExp(`@${user.username}`));
	});

	void it("answers 409 DATA_REQUEST_ALREADY_PENDING for a second pending request of the same type", async () => {
		const { authorization } = await createUserWithSession();
		await api()
			.post("/users/me/data-requests")
			.set("Authorization", authorization)
			.send({ type: "deletion" })
			.expect(201);

		const response = await api()
			.post("/users/me/data-requests")
			.set("Authorization", authorization)
			.send({ type: "deletion" });

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "DATA_REQUEST_ALREADY_PENDING");
	});

	void it("accepts a pending request of each type at the same time", async () => {
		const { authorization } = await createUserWithSession();

		for (const type of ["export", "deletion"]) {
			await api()
				.post("/users/me/data-requests")
				.set("Authorization", authorization)
				.send({ type })
				.expect(201);
		}
	});

	void it("accepts a new request once the previous one was resolved", async () => {
		const { user, authorization } = await createUserWithSession();
		await resolvedExport(user.id, 1);

		const response = await api()
			.post("/users/me/data-requests")
			.set("Authorization", authorization)
			.send({ type: "export" });

		assert.equal(response.status, 201);
	});

	void it("rejects an unknown type", async () => {
		const { authorization } = await createUserWithSession();

		const response = await api()
			.post("/users/me/data-requests")
			.set("Authorization", authorization)
			.send({ type: "rectification" });

		assert.equal(response.status, 422);
	});

	void it("answers 422 AUTH_SCHEMA_INVALID without a token", async () => {
		const response = await api()
			.post("/users/me/data-requests")
			.send({ type: "export" });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
		assert.equal(await DataRequest.count({ where: { userId: null } }), 0);
	});
});

void describe("GET /users/me/data-requests", () => {
	void it("lists only the user's own requests, newest first", async () => {
		const { user, authorization } = await createUserWithSession();
		const other = await createUser();
		const older = await resolvedExport(user.id, 3);
		const newer = await DataRequest.create({
			userId: user.id,
			type: "deletion"
		});
		await DataRequest.create({ userId: other.id, type: "export" });

		const response = await api()
			.get("/users/me/data-requests")
			.set("Authorization", authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(
			response.body.data.requests.map(
				(request: { id: string }) => request.id
			),
			[newer.id, older.id]
		);
	});
});

void describe("GET /users/me/data-requests/:requestId/download", () => {
	void it("downloads the completed export as an attachment", async () => {
		const { user, authorization } = await createUserWithSession();
		const request = await resolvedExport(user.id, 1);

		const response = await api()
			.get(`/users/me/data-requests/${request.id}/download`)
			.set("Authorization", authorization);

		assert.equal(response.status, 200);
		assert.match(
			String(response.headers["content-disposition"]),
			new RegExp(
				`^attachment; filename="completr-data-${user.username}-\\d{4}-\\d{2}-\\d{2}\\.json"$`
			)
		);
		assert.equal(response.body.account.id, user.id);
		assert.equal("password" in response.body.account, false);
	});

	void it("answers 404 DATA_REQUEST_NOT_FOUND for another user's request", async () => {
		const { authorization } = await createUserWithSession();
		const other = await createUser();
		const request = await resolvedExport(other.id, 1);

		const response = await api()
			.get(`/users/me/data-requests/${request.id}/download`)
			.set("Authorization", authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "DATA_REQUEST_NOT_FOUND");
	});

	void it("answers 404 DATA_REQUEST_NOT_FOUND for an unknown request", async () => {
		const { authorization } = await createUserWithSession();

		const response = await api()
			.get(
				"/users/me/data-requests/00000000-0000-4000-8000-000000000000/download"
			)
			.set("Authorization", authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "DATA_REQUEST_NOT_FOUND");
	});

	void it("answers 409 DATA_REQUEST_NOT_DOWNLOADABLE for pending, rejected and deletion requests", async () => {
		const { user, authorization } = await createUserWithSession();
		const requests = await Promise.all([
			DataRequest.create({ userId: user.id, type: "export" }),
			DataRequest.create({
				userId: user.id,
				type: "export",
				status: "rejected",
				resolvedAt: new Date(),
				resolutionNote: "Duplicate"
			}),
			DataRequest.create({
				userId: user.id,
				type: "deletion",
				status: "completed",
				resolvedAt: new Date()
			})
		]);

		for (const request of requests) {
			const response = await api()
				.get(`/users/me/data-requests/${request.id}/download`)
				.set("Authorization", authorization);

			assert.equal(response.status, 409);
			assert.equal(response.body.type, "DATA_REQUEST_NOT_DOWNLOADABLE");
		}
	});

	void it("answers 410 DATA_REQUEST_EXPIRED after the 7 day window", async () => {
		const { user, authorization } = await createUserWithSession();
		const request = await resolvedExport(user.id, 8);

		const response = await api()
			.get(`/users/me/data-requests/${request.id}/download`)
			.set("Authorization", authorization);

		assert.equal(response.status, 410);
		assert.equal(response.body.type, "DATA_REQUEST_EXPIRED");
	});
});

void describe("GET /admin/data-requests", () => {
	void it("lists pending requests first by deadline, then the rest newest first", async () => {
		const admin = await createUserWithSession("admin");
		const owner = await createUser();
		const now = Date.now();
		const recentPending = await DataRequest.create({
			userId: owner.id,
			type: "export",
			requestedAt: new Date(now - DAY_MS)
		});
		const urgentPending = await DataRequest.create({
			userId: owner.id,
			type: "deletion",
			requestedAt: new Date(now - 25 * DAY_MS)
		});
		const oldResolved = await DataRequest.create({
			userId: owner.id,
			type: "export",
			status: "completed",
			requestedAt: new Date(now - 40 * DAY_MS),
			resolvedAt: new Date(now - 39 * DAY_MS)
		});
		const newResolved = await DataRequest.create({
			userId: null,
			type: "deletion",
			status: "completed",
			requestedAt: new Date(now - 10 * DAY_MS),
			resolvedAt: new Date(now - 9 * DAY_MS)
		});

		const response = await api()
			.get("/admin/data-requests")
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 200);
		const ids = response.body.data.requests.map(
			(request: { id: string }) => request.id
		);
		assert.deepEqual(
			ids.filter((id: string) =>
				[
					recentPending.id,
					urgentPending.id,
					oldResolved.id,
					newResolved.id
				].includes(id)
			),
			[urgentPending.id, recentPending.id, newResolved.id, oldResolved.id]
		);
		const byId = new Map(
			response.body.data.requests.map(
				(request: { id: string }) => [request.id, request] as const
			)
		);
		assert.deepEqual(
			(byId.get(urgentPending.id) as { user: unknown }).user,
			{
				id: owner.id,
				username: owner.username,
				email: owner.email
			}
		);
		assert.equal(
			(byId.get(newResolved.id) as { user: unknown }).user,
			null
		);
		assert.ok(response.body.data.total >= 4);
	});

	void it("filters by status and type", async () => {
		const admin = await createUserWithSession("admin");
		const owner = await createUser();
		const rejected = await DataRequest.create({
			userId: owner.id,
			type: "deletion",
			status: "rejected",
			resolvedAt: new Date(),
			resolutionNote: "Identity not verified"
		});

		const response = await api()
			.get("/admin/data-requests?status=rejected&type=deletion")
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 200);
		for (const request of response.body.data.requests) {
			assert.equal(request.status, "rejected");
			assert.equal(request.type, "deletion");
		}
		assert.ok(
			response.body.data.requests.some(
				(request: { id: string }) => request.id === rejected.id
			)
		);
	});

	for (const role of NON_ADMIN_ROLES) {
		void it(`hides the route from ${role}`, async () => {
			const { authorization } = await createUserWithSession(role);

			const response = await api()
				.get("/admin/data-requests")
				.set("Authorization", authorization);

			assert.equal(response.status, 404);
		});
	}
});

void describe("POST /admin/data-requests/:requestId/complete", () => {
	void it("completes an export, opens the download and emails the user", async () => {
		const admin = await createUserWithSession("admin");
		const owner = await createUser();
		const request = await DataRequest.create({
			userId: owner.id,
			type: "export"
		});

		const response = await api()
			.post(`/admin/data-requests/${request.id}/complete`)
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 200);
		const completed = response.body.data.request;
		assert.equal(completed.status, "completed");
		assert.ok(completed.resolvedAt);
		assert.equal(
			new Date(completed.downloadableUntil).getTime() -
				new Date(completed.resolvedAt).getTime(),
			7 * DAY_MS
		);
		const stored = await DataRequest.findByPk(request.id);
		assert.equal(stored!.resolvedById, admin.user.id);
		const mail = findLastMailTo(owner.email);
		assert.ok(mail);
		assert.match(mail.subject, /ready/);
		await auditEntry("data_request_completed", request.id);
	});

	void it("deletes the account of a deletion request after emailing the user", async () => {
		const admin = await createUserWithSession("admin");
		const owner = await createUser();
		const request = await DataRequest.create({
			userId: owner.id,
			type: "deletion"
		});

		const response = await api()
			.post(`/admin/data-requests/${request.id}/complete`)
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.request.status, "completed");
		assert.equal(response.body.data.request.downloadableUntil, null);
		assert.equal(await User.count({ where: { id: owner.id } }), 0);
		const stored = await DataRequest.findByPk(request.id);
		assert.equal(stored!.status, "completed");
		assert.equal(stored!.userId, null);
		const mail = findLastMailTo(owner.email);
		assert.ok(mail);
		assert.match(mail.subject, /deleted/);
		await auditEntry("user_deleted", owner.id);
		await auditEntry("data_request_completed", request.id);

		const list = await api()
			.get("/admin/data-requests?type=deletion&status=completed")
			.set("Authorization", admin.authorization)
			.expect(200);
		const listed = list.body.data.requests.find(
			(item: { id: string }) => item.id === request.id
		);
		assert.equal(listed.user, null);
	});

	void it("completes a deletion request whose account was already deleted", async () => {
		const admin = await createUserWithSession("admin");
		const owner = await createUser();
		const request = await DataRequest.create({
			userId: owner.id,
			type: "deletion"
		});
		await api()
			.delete(`/admin/users/${owner.id}`)
			.set("Authorization", admin.authorization)
			.expect(204);

		const response = await api()
			.post(`/admin/data-requests/${request.id}/complete`)
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.request.status, "completed");
	});

	void it("answers 409 USER_DELETE_FORBIDDEN for the deletion request of an admin", async () => {
		const admin = await createUserWithSession("admin");
		const otherAdmin = await createUser({ role: "admin" });
		const request = await DataRequest.create({
			userId: otherAdmin.id,
			type: "deletion"
		});

		const response = await api()
			.post(`/admin/data-requests/${request.id}/complete`)
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "USER_DELETE_FORBIDDEN");
		assert.ok(await User.findByPk(otherAdmin.id));
		assert.equal(
			(await DataRequest.findByPk(request.id))!.status,
			"pending"
		);
		assert.equal(findLastMailTo(otherAdmin.email), undefined);
	});

	void it("answers 409 DATA_REQUEST_NOT_PENDING for a resolved request", async () => {
		const admin = await createUserWithSession("admin");
		const owner = await createUser();
		const request = await resolvedExport(owner.id, 1);

		const response = await api()
			.post(`/admin/data-requests/${request.id}/complete`)
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "DATA_REQUEST_NOT_PENDING");
	});

	void it("answers 404 DATA_REQUEST_NOT_FOUND for an unknown request", async () => {
		const admin = await createUserWithSession("admin");

		const response = await api()
			.post(
				"/admin/data-requests/00000000-0000-4000-8000-000000000000/complete"
			)
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "DATA_REQUEST_NOT_FOUND");
	});

	for (const role of NON_ADMIN_ROLES) {
		void it(`hides the route from ${role}`, async () => {
			const { authorization } = await createUserWithSession(role);
			const owner = await createUser();
			const request = await DataRequest.create({
				userId: owner.id,
				type: "deletion"
			});

			const response = await api()
				.post(`/admin/data-requests/${request.id}/complete`)
				.set("Authorization", authorization);

			assert.equal(response.status, 404);
			assert.ok(await User.findByPk(owner.id));
		});
	}
});

void describe("POST /admin/data-requests/:requestId/reject", () => {
	void it("rejects with the reason, emails the user and audits it", async () => {
		const admin = await createUserWithSession("admin");
		const owner = await createUser();
		const request = await DataRequest.create({
			userId: owner.id,
			type: "deletion"
		});

		const response = await api()
			.post(`/admin/data-requests/${request.id}/reject`)
			.set("Authorization", admin.authorization)
			.send({ reason: "  Could not verify your identity  " });

		assert.equal(response.status, 200);
		const rejected = response.body.data.request;
		assert.equal(rejected.status, "rejected");
		assert.equal(rejected.resolutionNote, "Could not verify your identity");
		assert.ok(await User.findByPk(owner.id));
		const mail = findLastMailTo(owner.email);
		assert.ok(mail);
		assert.match(mail.text, /Could not verify your identity/);
		await auditEntry("data_request_rejected", request.id);
	});

	void it("requires a reason between 1 and 500 characters", async () => {
		const admin = await createUserWithSession("admin");
		const owner = await createUser();
		const request = await DataRequest.create({
			userId: owner.id,
			type: "export"
		});

		for (const body of [
			{},
			{ reason: "   " },
			{ reason: "x".repeat(501) }
		]) {
			const response = await api()
				.post(`/admin/data-requests/${request.id}/reject`)
				.set("Authorization", admin.authorization)
				.send(body);

			assert.equal(response.status, 422);
		}
		assert.equal(
			(await DataRequest.findByPk(request.id))!.status,
			"pending"
		);
	});

	void it("answers 409 DATA_REQUEST_NOT_PENDING for a resolved request", async () => {
		const admin = await createUserWithSession("admin");
		const owner = await createUser();
		const request = await resolvedExport(owner.id, 1);

		const response = await api()
			.post(`/admin/data-requests/${request.id}/reject`)
			.set("Authorization", admin.authorization)
			.send({ reason: "Too late" });

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "DATA_REQUEST_NOT_PENDING");
	});
});
