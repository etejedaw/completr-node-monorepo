import { type NextFunction, type Request, type Response } from "express";

import * as commonDomainError from "../errors/common.domain-error";
import { type RequestUser } from "../interfaces/request-user.interface";
import { type ExportFormatQuery } from "../schemas/export-format-query.schema";
import { isPremiumRole } from "../utils/is-premium-role.util";

export function exportFormatAccessMiddleware(
	request: Request,
	_response: Response,
	next: NextFunction
) {
	const { format } = request.locals.query as ExportFormatQuery;
	const user = request.locals.user as RequestUser;

	if (format === "json" && !isPremiumRole(user.role))
		throw commonDomainError.exportFormatPremium();

	return next();
}
