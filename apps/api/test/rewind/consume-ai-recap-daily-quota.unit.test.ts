import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

const PROBE_SCRIPT = `
const { RateLimiterMemory } = require("rate-limiter-flexible");
const { consumeAiRecapDailyQuota } = require("./src/rewind/utils/consume-ai-recap-daily-quota.util");
const limiter = new RateLimiterMemory({ points: 2, duration: 60 });
const owner = { id: "owner-1", role: process.env.PROBE_ROLE };
(async () => {
	const outcomes = [];
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			await consumeAiRecapDailyQuota(limiter, owner);
			outcomes.push("passed");
		} catch (error) {
			outcomes.push(error.code);
		}
	}
	console.log(outcomes.join(","));
})();
`;

function probe(environment: Record<string, string>) {
	const result = spawnSync(
		process.execPath,
		["-r", "ts-node/register", "-e", PROBE_SCRIPT],
		{
			cwd: process.cwd(),
			env: {
				PATH: process.env.PATH,
				NODE_ENV: "dev",
				PROBE_ROLE: "premium",
				...environment
			},
			encoding: "utf8"
		}
	);
	assert.equal(result.status, 0, result.stderr);
	return result.stdout.trim().split("\n").at(-1);
}

void describe("consumeAiRecapDailyQuota", () => {
	void it("rejects the AI recap after the daily quota with REWIND_AI_RECAP_DAILY_LIMIT", () => {
		assert.equal(probe({}), "passed,passed,REWIND_AI_RECAP_DAILY_LIMIT");
	});

	void it("does not count admins and moderators", () => {
		assert.equal(probe({ PROBE_ROLE: "admin" }), "passed,passed,passed");
		assert.equal(
			probe({ PROBE_ROLE: "moderator" }),
			"passed,passed,passed"
		);
	});

	void it("does not limit when rate limiting is off", () => {
		assert.equal(
			probe({ RATE_LIMIT_ENABLED: "false" }),
			"passed,passed,passed"
		);
		assert.equal(probe({ NODE_ENV: "test" }), "passed,passed,passed");
	});
});
