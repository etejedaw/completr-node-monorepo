import { NextFunction, Request, Response } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";
import * as authDomainsErrors from "../../auth/errors/auth.domains-error";

const PRIVILEGED_ROLES = new Set(["admin", "moderator"]);

export function rateLimiterMiddleware(limiter: RateLimiterMemory) {
	return async (
		request: Request,
		_response: Response,
		next: NextFunction
	) => {
		try {
			if (
				request.locals?.user &&
				PRIVILEGED_ROLES.has(request.locals.user.role)
			) {
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
