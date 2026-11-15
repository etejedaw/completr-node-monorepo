import "../rawg/rawg-env.setup";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import { AuditLog } from "../../src/audit/audit.model";
import { GameExternal } from "../../src/game-external/game-external.model";
import { Game } from "../../src/games/game.model";
import { Job } from "../../src/jobs/job.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";
import { ELDEN_RING_DETAIL } from "../rawg/fixtures/rawg.fixtures";
import { jsonResponse, stubRawgFetch } from "../rawg/rawg-fetch.helper";

const CONCURRENT_STARTS = 8;

let authorization: string;

useTestDatabase(async () => {
	authorization = (await createUserWithSession("admin")).authorization;
});

beforeEach(async () => {
	await GameExternal.destroy({ where: {} });
	await Game.destroy({ where: {} });
	await Job.destroy({ where: {} });
	await AuditLog.destroy({ where: {} });
});

afterEach(() => {
	mock.restoreAll();
});

function startPopulateRawg(query: Record<string, string> = {}) {
	return api()
		.post("/admin/jobs/populate-rawg")
		.query(query)
		.set("Authorization", authorization);
}

function holdRawgUntil(gate: Promise<void>) {
	stubRawgFetch(async () => {
		await gate;
		return jsonResponse(ELDEN_RING_DETAIL);
	});
}

function openGate() {
	let release!: () => void;
	const gate = new Promise<void>(resolve => {
		release = resolve;
	});
	return { gate, release };
}

void describe("job start concurrency", () => {
	void it("starts a single job and a single audit entry for simultaneous starts", async () => {
		await Game.create({ title: "Elden Ring", code: "elden-ring" });
		const { gate, release } = openGate();
		holdRawgUntil(gate);

		const responses = await Promise.all(
			Array.from({ length: CONCURRENT_STARTS }, () => startPopulateRawg())
		);

		for (const response of responses) assert.equal(response.status, 202);
		const jobIds = new Set(
			responses.map(response => response.body.data.job.id as string)
		);
		assert.equal(jobIds.size, 1);
		assert.equal(await Job.count({ where: { type: "populate_rawg" } }), 1);
		await eventually(async () => {
			assert.equal(
				await AuditLog.count({ where: { action: "job_started" } }),
				1
			);
		});

		release();
		await eventually(async () => {
			const job = await Job.findByPk([...jobIds][0]);
			assert.notEqual(job?.status, "running");
		});
	});

	void it("does not audit a start that returned the job already running", async () => {
		await Game.create({ title: "Elden Ring", code: "elden-ring" });
		const { gate, release } = openGate();
		holdRawgUntil(gate);

		await startPopulateRawg();
		await startPopulateRawg();
		await startPopulateRawg();

		await eventually(async () => {
			assert.equal(
				await AuditLog.count({ where: { action: "job_started" } }),
				1
			);
		});
		release();
	});
});

void describe("DELETE /admin/jobs/:jobId", () => {
	void it("answers an unknown job with a Problem Details 404", async () => {
		const response = await api()
			.delete(`/admin/jobs/${randomUUID()}`)
			.set("Authorization", authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "JOB_NOT_FOUND");
	});

	void it("answers cancelling the same job twice with a 404 the second time", async () => {
		await Game.create({ title: "Elden Ring", code: "elden-ring" });
		const { gate, release } = openGate();
		holdRawgUntil(gate);
		const started = await startPopulateRawg();
		const jobId = started.body.data.job.id as string;

		const [first, second] = await Promise.all([
			api()
				.delete(`/admin/jobs/${jobId}`)
				.set("Authorization", authorization),
			api()
				.delete(`/admin/jobs/${jobId}`)
				.set("Authorization", authorization)
		]);

		assert.deepEqual([first.status, second.status].sort(), [204, 404]);
		release();
	});

	void it("rejects a garbage job id", async () => {
		const response = await api()
			.delete("/admin/jobs/not-a-uuid")
			.set("Authorization", authorization);

		assert.equal(response.status, 422);
	});
});

void describe("POST /admin/jobs/populate-rawg input", () => {
	for (const limit of ["abc", "-1", "0", "1.5", ""]) {
		void it(`rejects the limit "${limit}" without starting a job`, async () => {
			const response = await startPopulateRawg({ limit });

			assert.equal(response.status, 422);
			assert.equal(await Job.count(), 0);
		});
	}

	void it("rejects unknown query params", async () => {
		const response = await startPopulateRawg({ sneaky: "1" });

		assert.equal(response.status, 422);
	});
});
