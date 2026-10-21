import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { AuditLog } from "../../src/audit/audit.model";
import { Backlog } from "../../src/backlog/backlog.model";
import { apiKeysConfig } from "../../src/common/config/api-keys.config";
import { CoopRun } from "../../src/coop-runs/coop-run.model";
import { GamePopularity } from "../../src/game-popularity/game-popularity.model";
import { GameScore } from "../../src/game-scores/game-score.model";
import { GameTime } from "../../src/game-times/game-time.model";
import { Job } from "../../src/jobs/job.model";
import { Review } from "../../src/reviews/review.model";
import { User } from "../../src/users/user.model";
import { type UserRole } from "../../src/users/user-role.type";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";
import {
	createBacklog,
	createGame,
	createPlatform,
	createScoreSource,
	createShelfEntries,
	createUser
} from "../helpers/factories.helper";

useTestDatabase(async () => {
	await createScoreSource({ code: "completr" });
});

const NON_ADMIN_ROLES: UserRole[] = ["user", "premium", "moderator"];

const LOCAL_JOB_ENDPOINTS = [
	{ path: "calculate-ratings", type: "calculate_ratings" },
	{ path: "calculate-durations", type: "calculate_durations" },
	{ path: "recompute-popularity", type: "recompute_popularity" },
	{ path: "cleanup-coop-runs", type: "cleanup_coop_runs" }
] as const;

const ALL_JOB_PATHS = [
	"populate-rawg",
	...LOCAL_JOB_ENDPOINTS.map(endpoint => endpoint.path)
];

function auditEntry(action: string, targetId: string) {
	return eventually(async () => {
		const entry = await AuditLog.findOne({ where: { action, targetId } });
		assert.ok(entry, `no audit entry ${action} for ${targetId}`);
		return entry;
	});
}

function finishedJob(jobId: string) {
	return eventually(async () => {
		const job = await Job.findByPk(jobId);
		assert.ok(job);
		assert.notEqual(job.status, "running");
		return job;
	});
}

async function activeUserCount() {
	return User.count({ where: { isActive: true } });
}

async function createEnoughActiveUsers() {
	const users: User[] = [];
	for (;;) {
		const minimum = Math.max(2, Math.ceil((await activeUserCount()) * 0.1));
		if (users.length >= minimum) return users;
		users.push(await createUser());
	}
}

void describe("GET /admin/jobs", () => {
	void it("lists the jobs with their status and result, newest first", async () => {
		const admin = await createUserWithSession("admin");
		const older = await Job.create({
			type: "listed_older",
			status: "completed",
			result: "done",
			completedAt: new Date()
		});
		const newer = await Job.create({
			type: "listed_newer",
			status: "running"
		});

		const response = await api()
			.get("/admin/jobs")
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 200);
		const ids = (response.body.data.jobs as { id: string }[]).map(
			job => job.id
		);
		assert.ok(ids.indexOf(newer.id) < ids.indexOf(older.id));
		const listedOlder = response.body.data.jobs.find(
			(job: { id: string }) => job.id === older.id
		);
		assert.equal(listedOlder.type, "listed_older");
		assert.equal(listedOlder.status, "completed");
		assert.equal(listedOlder.result, "done");
		assert.ok(listedOlder.completedAt);
		assert.ok(listedOlder.createdAt);
	});

	void it("returns at most the 20 latest jobs", async () => {
		const admin = await createUserWithSession("admin");
		await Job.bulkCreate(
			Array.from({ length: 25 }, () => ({
				type: "bulk_listed",
				status: "completed"
			}))
		);

		const response = await api()
			.get("/admin/jobs")
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.jobs.length, 20);
	});

	for (const role of NON_ADMIN_ROLES) {
		void it(`hides the route from a ${role} with 404 AUTH_ROUTE_NOT_FOUND`, async () => {
			const account = await createUserWithSession(role);

			const response = await api()
				.get("/admin/jobs")
				.set("Authorization", account.authorization);

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
		});
	}

	void it("hides the route from an anonymous caller with 404 AUTH_ROUTE_NOT_FOUND", async () => {
		const response = await api().get("/admin/jobs");

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
	});
});

void describe("DELETE /admin/jobs/:jobId", () => {
	void it("cancels a running job and shows it as cancelled", async () => {
		const admin = await createUserWithSession("admin");
		const job = await Job.create({ type: "cancel_me", status: "running" });

		const response = await api()
			.delete(`/admin/jobs/${job.id}`)
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 204);
		await job.reload();
		assert.equal(job.status, "cancelled");
		assert.ok(job.completedAt);

		const listing = await api()
			.get("/admin/jobs")
			.set("Authorization", admin.authorization)
			.expect(200);
		const listed = listing.body.data.jobs.find(
			(entry: { id: string }) => entry.id === job.id
		);
		assert.equal(listed.status, "cancelled");
	});

	void it("answers 404 for a job that already finished and leaves it untouched", async () => {
		const admin = await createUserWithSession("admin");
		const job = await Job.create({
			type: "already_done",
			status: "completed",
			result: "done"
		});

		const response = await api()
			.delete(`/admin/jobs/${job.id}`)
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 404);
		await job.reload();
		assert.equal(job.status, "completed");
		assert.equal(job.result, "done");
	});

	void it("answers 404 for an unknown job", async () => {
		const admin = await createUserWithSession("admin");

		const response = await api()
			.delete(`/admin/jobs/${randomUUID()}`)
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 404);
	});

	void it(
		"answers 4xx for a malformed job id instead of a server error",
		{
			todo: "bug: DELETE /admin/jobs/:jobId does not validate the uuid and answers 500"
		},
		async () => {
			const admin = await createUserWithSession("admin");

			const response = await api()
				.delete("/admin/jobs/not-a-uuid")
				.set("Authorization", admin.authorization);

			assert.ok(
				response.status >= 400 && response.status < 500,
				`expected 4xx, got ${response.status}`
			);
		}
	);

	for (const role of NON_ADMIN_ROLES) {
		void it(`hides the route from a ${role} and keeps the job running`, async () => {
			const account = await createUserWithSession(role);
			const job = await Job.create({
				type: "keep_me",
				status: "running"
			});

			const response = await api()
				.delete(`/admin/jobs/${job.id}`)
				.set("Authorization", account.authorization);

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
			await job.reload();
			assert.equal(job.status, "running");
		});
	}

	void it("hides the route from an anonymous caller and keeps the job running", async () => {
		const job = await Job.create({
			type: "keep_me_anon",
			status: "running"
		});

		const response = await api().delete(`/admin/jobs/${job.id}`);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
		await job.reload();
		assert.equal(job.status, "running");
	});
});

void describe("POST /admin/jobs/*", () => {
	for (const path of ALL_JOB_PATHS) {
		for (const role of NON_ADMIN_ROLES) {
			void it(`hides ${path} from a ${role} and starts no job`, async () => {
				const account = await createUserWithSession(role);
				const jobsBefore = await Job.count();

				const response = await api()
					.post(`/admin/jobs/${path}`)
					.set("Authorization", account.authorization);

				assert.equal(response.status, 404);
				assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
				assert.equal(await Job.count(), jobsBefore);
			});
		}

		void it(`hides ${path} from an anonymous caller and starts no job`, async () => {
			const jobsBefore = await Job.count();

			const response = await api().post(`/admin/jobs/${path}`);

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
			assert.equal(await Job.count(), jobsBefore);
		});
	}

	void it(
		"answers 503 RAWG_DISABLED to an admin when RAWG has no API key",
		{ skip: apiKeysConfig.RAWG_API_KEY !== undefined },
		async () => {
			const admin = await createUserWithSession("admin");
			const jobsBefore = await Job.count({
				where: { type: "populate_rawg" }
			});

			const response = await api()
				.post("/admin/jobs/populate-rawg")
				.set("Authorization", admin.authorization);

			assert.equal(response.status, 503);
			assert.equal(response.body.type, "RAWG_DISABLED");
			assert.equal(
				await Job.count({ where: { type: "populate_rawg" } }),
				jobsBefore
			);
		}
	);

	for (const { path, type } of LOCAL_JOB_ENDPOINTS) {
		void it(`starts ${path} for an admin, completes it and audits the start`, async () => {
			const admin = await createUserWithSession("admin");

			const response = await api()
				.post(`/admin/jobs/${path}`)
				.set("Authorization", admin.authorization);

			assert.equal(response.status, 202);
			assert.equal(response.body.data.job.type, type);
			assert.equal(response.body.data.job.status, "running");

			const jobId = response.body.data.job.id as string;
			const job = await finishedJob(jobId);
			assert.equal(job.status, "completed");
			assert.ok(job.result);
			assert.ok(job.completedAt);

			const entry = await auditEntry("job_started", jobId);
			assert.equal(entry.userId, admin.user.id);
			assert.equal(entry.targetType, "job");
		});

		void it(`returns the job already in progress instead of starting a second ${type}`, async () => {
			const admin = await createUserWithSession("admin");
			const inProgress = await Job.create({ type, status: "running" });
			const jobsBefore = await Job.count({ where: { type } });

			const response = await api()
				.post(`/admin/jobs/${path}`)
				.set("Authorization", admin.authorization);

			assert.equal(response.status, 202);
			assert.equal(response.body.data.job.id, inProgress.id);
			assert.equal(await Job.count({ where: { type } }), jobsBefore);
			await inProgress.destroy();
		});
	}

	void it("calculate-ratings stores the average review rating as the completr score", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();
		const reviewers = await createEnoughActiveUsers();
		await Review.bulkCreate(
			reviewers.map((reviewer, index) => ({
				userId: reviewer.id,
				gameId: game.id,
				rating: index % 2 === 0 ? 4 : 5
			}))
		);
		const expected =
			Math.round(
				(reviewers.reduce(
					(sum, _reviewer, index) => sum + (index % 2 === 0 ? 4 : 5),
					0
				) /
					reviewers.length) *
					100
			) / 100;

		const response = await api()
			.post("/admin/jobs/calculate-ratings")
			.set("Authorization", admin.authorization)
			.expect(202);
		const job = await finishedJob(response.body.data.job.id);

		assert.equal(job.status, "completed");
		const stored = await GameScore.findOne({
			where: { gameId: game.id, source: "completr" }
		});
		assert.equal(stored?.score, expected);
	});

	void it("calculate-ratings skips games with fewer reviews than the minimum", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();
		const reviewer = await createUser();
		await Review.create({
			userId: reviewer.id,
			gameId: game.id,
			rating: 5
		});

		const response = await api()
			.post("/admin/jobs/calculate-ratings")
			.set("Authorization", admin.authorization)
			.expect(202);
		await finishedJob(response.body.data.job.id);

		assert.equal(
			await GameScore.count({
				where: { gameId: game.id, source: "completr" }
			}),
			0
		);
	});

	void it("calculate-durations stores the average real duration as the completr time", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();
		const platform = await createPlatform();
		const players = await createEnoughActiveUsers();
		for (const [index, player] of players.entries()) {
			const backlog = await createBacklog(
				player.id,
				game.id,
				platform.id,
				{
					status: "completed"
				}
			);
			await backlog.update({ realDuration: index % 2 === 0 ? 10 : 20 });
		}
		const total = players.reduce(
			(sum, _player, index) => sum + (index % 2 === 0 ? 10 : 20),
			0
		);
		const expected = Math.round((total / players.length) * 100) / 100;

		const response = await api()
			.post("/admin/jobs/calculate-durations")
			.set("Authorization", admin.authorization)
			.expect(202);
		const job = await finishedJob(response.body.data.job.id);

		assert.equal(job.status, "completed");
		const stored = await GameTime.findOne({
			where: { gameId: game.id, source: "completr" }
		});
		assert.equal(stored?.duration, expected);
		assert.ok(await Backlog.count({ where: { gameId: game.id } }));
	});

	void it("recompute-popularity counts the distinct users that shelved each game", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();
		const platform = await createPlatform();
		const [first, second] = await Promise.all([createUser(), createUser()]);
		await createShelfEntries(first.id, game.id, platform.id, 1);
		await createShelfEntries(second.id, game.id, platform.id, 1);

		const response = await api()
			.post("/admin/jobs/recompute-popularity")
			.set("Authorization", admin.authorization)
			.expect(202);
		const job = await finishedJob(response.body.data.job.id);

		assert.equal(job.status, "completed");
		const stored = await GamePopularity.findOne({
			where: { gameId: game.id }
		});
		assert.equal(stored?.score, 2);
	});

	void it("cleanup-coop-runs removes runs with a single member and keeps shared runs", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();
		const platform = await createPlatform();
		const [host, partner] = await Promise.all([createUser(), createUser()]);
		const orphanRun = await CoopRun.create({ gameId: game.id });
		const sharedRun = await CoopRun.create({ gameId: game.id });
		const orphanBacklog = await createBacklog(
			host.id,
			game.id,
			platform.id
		);
		await orphanBacklog.update({ coopRunId: orphanRun.id });
		const sharedHostBacklog = await createBacklog(
			host.id,
			game.id,
			platform.id
		);
		await sharedHostBacklog.update({ coopRunId: sharedRun.id });
		const sharedPartnerBacklog = await createBacklog(
			partner.id,
			game.id,
			platform.id
		);
		await sharedPartnerBacklog.update({ coopRunId: sharedRun.id });

		const response = await api()
			.post("/admin/jobs/cleanup-coop-runs")
			.set("Authorization", admin.authorization)
			.expect(202);
		const job = await finishedJob(response.body.data.job.id);

		assert.equal(job.status, "completed");
		assert.equal(await CoopRun.count({ where: { id: orphanRun.id } }), 0);
		assert.equal(await CoopRun.count({ where: { id: sharedRun.id } }), 1);
		await orphanBacklog.reload();
		assert.equal(orphanBacklog.coopRunId, null);
		await sharedHostBacklog.reload();
		assert.equal(sharedHostBacklog.coopRunId, sharedRun.id);
	});
});
