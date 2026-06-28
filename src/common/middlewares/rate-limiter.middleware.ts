import { type NextFunction, type Request, type Response } from "express";
import { type RateLimiterMemory } from "rate-limiter-flexible";

import * as authDomainsErrors from "../../auth/errors/auth.domains-error";
import { type RequestUser } from "../interfaces/request-user.interface";

const PRIVILEGED_ROLES = new Set(["admin", "moderator"]);

export function rateLimiterMiddleware(limiter: RateLimiterMemory) {
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

			const ip = request.ip;
			await limiter.consume(ip!);
			return next();
		} catch (error) {
			throw authDomainsErrors.authRateLimited({ raw: error });
		}
	};
}
