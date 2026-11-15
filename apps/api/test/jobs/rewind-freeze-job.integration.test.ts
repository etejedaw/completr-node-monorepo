import "../rewind/rewind-today-env.setup";

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import { AuditLog } from "../../src/audit/audit.model";
import { type Game } from "../../src/games/game.model";
import { Job } from "../../src/jobs/job.model";
import { type Platform } from "../../src/platforms/platform.model";
import { Rewind } from "../../src/rewind/rewind.model";
import * as rewindFreezeService from "../../src/rewind/services/rewind-freeze.service";
import { RewindEdition } from "../../src/rewind-editions/rewind-edition.model";
import { type UserRole } from "../../src/users/user-role.type";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";
import { createGame, createPlatform } from "../helpers/factories.helper";
import {
	closeEdition,
	findEditionFrozenAt,
	holdFreezeLockWhile
} from "../rewind/rewind-freeze.helper";
import {
	addRun,
	findRewindRow,
	generate,
	openRewindEdition2026,
	signUpOn
} from "../rewind/rewind-generation.helper";

const REWIND_FREEZE_PATH = "/admin/jobs/rewind-freeze";
const NON_ADMIN_ROLES: UserRole[] = ["user", "premium", "moderator"];

let platform: Platform;
let game: Game;

useTestDatabase(async () => {
	platform = await createPlatform();
	game = await createGame({ title: "Hades" });
});

beforeEach(async () => {
	await Job.destroy({ where: {} });
	await Rewind.destroy({ where: {} });
	await RewindEdition.destroy({ where: {} });
	await openRewindEdition2026();
});

afterEach(() => {
	mock.restoreAll();
});

async function playerWithClosedRewind() {
	const player = await signUpOn("2025-01-15T00:00:00.000Z");
	await addRun(player, game, platform, { finishedAt: "2026-03-10" });
	await generate(player, 2026).expect(201);
	await closeEdition(2026);
	return player;
}

function startFreeze(authorization: string) {
	return api().post(REWIND_FREEZE_PATH).set("Authorization", authorization);
}

function finishedJob(jobId: string) {
	return eventually(async () => {
		const job = await Job.findByPk(jobId);
		assert.ok(job);
		assert.notEqual(job.status, "running");
		return job;
	});
}

void describe("POST /admin/jobs/rewind-freeze", () => {
	void it("freezes the closed edition, reports it in the job and audits who started it", async () => {
		const admin = await createUserWithSession("admin");
		const player = await playerWithClosedRewind();

		const response = await startFreeze(admin.authorization).expect(202);
		const { job } = response.body.data;
		const finished = await finishedJob(job.id);
		const audit = await eventually(async () => {
			const entry = await AuditLog.findOne({
				where: { action: "job_started", targetId: job.id }
			});
			assert.ok(entry);
			return entry;
		});

		assert.equal(job.type, "rewind_freeze");
		assert.equal(job.status, "running");
		assert.equal(finished.status, "completed");
		assert.equal(
			finished.result,
			"Closed editions: 2026, Frozen editions: 2026, Rewinds frozen: 1, Pending AI recap: 0, Failed: 0"
		);
		assert.ok((await findRewindRow(player, 2026))?.frozenAt);
		assert.ok(await findEditionFrozenAt(2026));
		assert.equal(audit.userId, admin.user.id);
	});

	void it("does nothing on a second run and says so", async () => {
		const admin = await createUserWithSession("admin");
		await playerWithClosedRewind();

		const first = await startFreeze(admin.authorization).expect(202);
		await finishedJob(first.body.data.job.id);
		const second = await startFreeze(admin.authorization).expect(202);
		const finished = await finishedJob(second.body.data.job.id);

		assert.equal(finished.status, "completed");
		assert.equal(
			finished.result,
			"Closed editions: none, Frozen editions: none, Rewinds frozen: 0, Pending AI recap: 0, Failed: 0"
		);
	});

	void it("survives a double click without freezing anything twice", async () => {
		const admin = await createUserWithSession("admin");
		const player = await playerWithClosedRewind();

		const responses = await Promise.all([
			startFreeze(admin.authorization),
			startFreeze(admin.authorization)
		]);
		const jobIds = new Set<string>(
			responses.map(response => response.body.data.job.id)
		);
		const jobs = await Promise.all([...jobIds].map(finishedJob));
		const frozen = await findRewindRow(player, 2026);

		for (const response of responses) assert.equal(response.status, 202);
		assert.ok(jobs.every(job => job.status === "completed"));
		assert.equal(
			jobs.filter(job => job.result?.includes("Rewinds frozen: 1"))
				.length,
			1
		);
		assert.ok(frozen?.frozenAt);
	});

	void it("completes without touching anything while another process holds the lock", async () => {
		const admin = await createUserWithSession("admin");
		const player = await playerWithClosedRewind();

		const finished = await holdFreezeLockWhile(async () => {
			const response = await startFreeze(admin.authorization).expect(202);
			return finishedJob(response.body.data.job.id);
		});

		assert.equal(finished.status, "completed");
		assert.equal(
			finished.result,
			"Skipped: another rewind freeze run holds the lock"
		);
		assert.equal((await findRewindRow(player, 2026))?.frozenAt, null);
	});

	void it("marks the job failed when the freeze breaks", async () => {
		const admin = await createUserWithSession("admin");
		mock.method(rewindFreezeService, "freezeClosedRewindEditions", () =>
			Promise.reject(new Error("database went away"))
		);

		const response = await startFreeze(admin.authorization).expect(202);
		const finished = await finishedJob(response.body.data.job.id);

		assert.equal(finished.status, "failed");
		assert.equal(finished.result, "Failed. Reason: database went away");
	});

	void it("hides the endpoint from non-admins and from guests", async () => {
		const player = await playerWithClosedRewind();

		for (const role of NON_ADMIN_ROLES) {
			const account = await createUserWithSession(role);
			await startFreeze(account.authorization).expect(404);
		}
		await api().post(REWIND_FREEZE_PATH).expect(404);
		await startFreeze("Bearer garbage").expect(404);

		assert.equal(await Job.count(), 0);
		assert.equal((await findRewindRow(player, 2026))?.frozenAt, null);
	});
});
