import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";

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
