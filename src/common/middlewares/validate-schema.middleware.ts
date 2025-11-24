import { NextFunction, Request, Response } from "express";
import { ZodError, ZodType } from "zod";

export function validateSchemaMiddleware(
	zodSchema: ZodType,
	requestKey: RequestKey
) {
	return (request: Request, response: Response, next: NextFunction) => {
		try {
			const data = zodSchema.parse(request[requestKey]);
			request[requestKey] = data;
			next();
		} catch (error) {
			if (error instanceof ZodError)
				return response.status(422).json({ error: JSON.parse(error.message) });
			throw error;
		}
	};
}

type RequestKey = "body" | "headers" | "params" | "query";
