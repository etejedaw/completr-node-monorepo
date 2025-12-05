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
			Object.assign(request[requestKey], data);
			next();
		} catch (error) {
			if (error instanceof ZodError)
				throw new DomainError(
					"Common Module",
					"COMMON_SCHEMA_INVALID",
					"Invalid request schema",
					{ error: JSON.parse(error.message) }
				);
			throw error;
		}
	};
}

type RequestKey = "body" | "headers" | "params" | "query";
