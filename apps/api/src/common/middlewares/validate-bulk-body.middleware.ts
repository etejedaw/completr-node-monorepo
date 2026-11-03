import { type NextFunction, type Request, type Response } from "express";
import z, { type ZodType } from "zod";

import { type BulkActionQuery } from "../schemas/bulk-action-query.schema";
import { validateSchemaMiddleware } from "./validate-schema.middleware";

export function validateBulkBodyMiddleware(
	bodySchemaByAction: Record<string, ZodType>
) {
	return (request: Request, response: Response, next: NextFunction) => {
		const { action } = request.locals.query as BulkActionQuery;
		const bodySchema = Object.hasOwn(bodySchemaByAction, action)
			? bodySchemaByAction[action]!
			: z.never();
		return validateSchemaMiddleware(bodySchema, "body")(
			request,
			response,
			next
		);
	};
}
