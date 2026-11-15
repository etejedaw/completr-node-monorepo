import { type NextFunction, type Request, type Response } from "express";
import { type RateLimiterMemory } from "rate-limiter-flexible";

import * as authDomainsErrors from "../../auth/errors/auth.domain-error";
import { type UserRole } from "../../users/user-role.type";
import { environmentConfig } from "../config/environment.config";
import { type RequestUser } from "../interfaces/request-user.interface";
import { resolveClientIp } from "../utils/client-ip.util";

const PRIVILEGED_ROLES: ReadonlySet<string> = new Set<UserRole>([
	"admin",
	"moderator"
]);

function skipRateLimit(
	_request: Request,
	_response: Response,
	next: NextFunction
) {
	next();
}

export function rateLimiterMiddleware(limiter: RateLimiterMemory) {
	if (
		environmentConfig.NODE_ENV === "test" ||
		!environmentConfig.RATE_LIMIT_ENABLED
	) {
		return skipRateLimit;
	}

	return async (
		request: Request,
		_response: Response,
		next: NextFunction
	) => {
		try {
			const user = request.locals?.user as RequestUser | undefined;
			if (user && PRIVILEGED_ROLES.has(user.role)) {
				return next();
			}

			await limiter.consume(resolveClientIp(request));
			return next();
		} catch (error) {
			throw authDomainsErrors.authRateLimited({ raw: error });
		}
	};
}
