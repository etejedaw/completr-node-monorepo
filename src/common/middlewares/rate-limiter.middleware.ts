import { NextFunction, Request, Response } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";
import * as authDomainsErrors from "../../auth/errors/auth.domains-error";

export function rateLimiterMiddleware(limiter: RateLimiterMemory) {
	return async (
		request: Request,
		_response: Response,
		next: NextFunction
	) => {
		try {
			const ip = request.ip;
			await limiter.consume(ip!);
			return next();
		} catch (error) {
			throw authDomainsErrors.authRateLimited({ raw: error });
		}
	};
}
