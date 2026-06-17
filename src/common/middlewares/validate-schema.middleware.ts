import { NextFunction, Request, Response } from "express";
import { ZodError, ZodType } from "zod";
import { DomainError } from "../errors/domain-error";

export function validateSchemaMiddleware(
	zodSchema: ZodType,
	requestKey: RequestKey
) {
	return (request: Request, _response: Response, next: NextFunction) => {
		try {
			const data = zodSchema.parse(request[requestKey]);
			request.locals = { ...(request.locals || {}), [requestKey]: data };
			next();
		} catch (error) {
			if (error instanceof ZodError) {
				const issues = error.issues.map(issue => ({
					path: issue.path.join("."),
					code: issue.code,
					message: issue.message
				}));
				throw new DomainError(
					"Common Module",
					"COMMON_SCHEMA_INVALID",
					"Invalid request schema",
					{ error: JSON.parse(error.message) },
					issues
				);
			}
			throw error;
		}
	};
}

type RequestKey = "body" | "headers" | "params" | "query";
