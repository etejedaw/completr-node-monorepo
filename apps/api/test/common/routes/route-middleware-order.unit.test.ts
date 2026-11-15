import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const SRC_ROOT = path.resolve(__dirname, "../../../src");
const ROUTE_FILES = [
	"users/users.routes.ts",
	"auth/auth.routes.ts",
	"invitations/invitations.routes.ts",
	"data-requests/data-requests.routes.ts",
	"audit/audit.routes.ts",
	"activity/activity.routes.ts",
	"user-followers/user-followers.routes.ts",
	"user-follow-requests/user-follow-requests.routes.ts"
];
const MIDDLEWARE_ARRAY =
	/\[\s*((?:rateLimiterMiddleware|authMiddleware|authOptionalMiddleware|hiddenRouteMiddleware)[^\]]*?)\s*\]\s*,/gs;
const AUTHENTICATORS =
	/authMiddleware\(|authOptionalMiddleware|hiddenRouteMiddleware\(/;

void describe("route middleware order", () => {
	for (const file of ROUTE_FILES) {
		void it(`${file} authenticates before it rate limits`, () => {
			const source = readFileSync(path.join(SRC_ROOT, file), "utf8");
			const arrays = [...source.matchAll(MIDDLEWARE_ARRAY)].map(
				match => match[1]!
			);
			assert.ok(arrays.length > 0);

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
