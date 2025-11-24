import { NextFunction, Request, Response } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";

export function rateLimiterMiddleware(limiter: RateLimiterMemory) {
	return async (request: Request, response: Response, next: NextFunction) => {
		try {
			const ip = request.ip;
			await limiter.consume(ip!);
		} catch (error) {
			return response.status(429).json({
				error: "Too many requests"
			});
		}
	};
}
