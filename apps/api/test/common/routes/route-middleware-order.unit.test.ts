import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const SRC_ROOT = path.resolve(__dirname, "../../../src");
const ROUTE_FILES = readdirSync(SRC_ROOT, { recursive: true, encoding: "utf8" })
	.filter(file => file.endsWith(".routes.ts"))
	.sort();
const MIDDLEWARE_ARRAY =
	/\[\s*((?:rateLimiterMiddleware|authMiddleware|authOptionalMiddleware|hiddenRouteMiddleware)[^\]]*?)\s*\]\s*,/gs;
const AUTHENTICATORS =
	/authMiddleware\(|authOptionalMiddleware|hiddenRouteMiddleware\(/;

void describe("route middleware order", () => {
	void it("finds every routes file", () => {
		assert.ok(ROUTE_FILES.length > 40);
	});

	for (const file of ROUTE_FILES) {
		void it(`${file} authenticates before it rate limits`, () => {
			const source = readFileSync(path.join(SRC_ROOT, file), "utf8");
			const arrays = [...source.matchAll(MIDDLEWARE_ARRAY)].map(
				match => match[1]!
			);
			for (const middlewares of arrays) {
				const limiterAt = middlewares.indexOf("rateLimiterMiddleware(");
				const authAt = middlewares.search(AUTHENTICATORS);
				if (limiterAt === -1 || authAt === -1) continue;
				assert.ok(
					authAt < limiterAt,
					`rate limiter runs before authentication in: ${middlewares}`
				);
			}
		});
	}
});
