import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

const PROBE_SCRIPT = `
const { RateLimiterMemory } = require("rate-limiter-flexible");
const { rateLimiterMiddleware } = require("./src/common/middlewares/rate-limiter.middleware");
const middleware = rateLimiterMiddleware(new RateLimiterMemory({ points: 1, duration: 60 }));
const request = { ip: "10.0.0.1", headers: {}, locals: {} };
(async () => {
	const outcomes = [];
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			await middleware(request, {}, () => {});
			outcomes.push("passed");
		} catch {
			outcomes.push("limited");
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
				...environment
			},
			encoding: "utf8"
		}
	);
	assert.equal(result.status, 0, result.stderr);
	return result.stdout.trim().split("\n").at(-1);
}

void describe("rateLimiterMiddleware environment switches", () => {
	void it("limits requests when RATE_LIMIT_ENABLED is not defined", () => {
		assert.equal(probe({}), "passed,limited,limited");
	});

	void it("limits requests when RATE_LIMIT_ENABLED is empty or true", () => {
		assert.equal(
			probe({ RATE_LIMIT_ENABLED: "" }),
			"passed,limited,limited"
		);
		assert.equal(
			probe({ RATE_LIMIT_ENABLED: "true" }),
			"passed,limited,limited"
		);
	});

	void it("does not limit when RATE_LIMIT_ENABLED is false", () => {
		assert.equal(
			probe({ RATE_LIMIT_ENABLED: "false" }),
			"passed,passed,passed"
		);
	});

	void it("does not limit under NODE_ENV=test even when enabled", () => {
		assert.equal(
			probe({ NODE_ENV: "test", RATE_LIMIT_ENABLED: "true" }),
			"passed,passed,passed"
		);
	});
});
