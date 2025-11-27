import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";
import { CustomRequest } from "../interfaces/custom-request.interface";

export function correlationIdMiddleware(
	request: Request,
	_response: Response,
	next: NextFunction
) {
	const customRequest = request as CustomRequest;
	const correlationId = randomUUID();
	customRequest["correlationId"] = correlationId;
	return next();
}
