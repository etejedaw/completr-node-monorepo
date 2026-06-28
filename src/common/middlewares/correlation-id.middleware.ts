import { randomUUID } from "crypto";
import { type NextFunction, type Request, type Response } from "express";

export function correlationIdMiddleware(
	request: Request,
	_response: Response,
	next: NextFunction
) {
	request.locals = {
		...request.locals,
		correlationId: randomUUID()
	};
	return next();
}
