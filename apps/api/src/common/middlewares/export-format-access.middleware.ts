import { type NextFunction, type Request, type Response } from "express";

import * as commonDomainError from "../errors/common.domain-error";
import { type RequestUser } from "../interfaces/request-user.interface";
import { type ExportFormat } from "../types/export-format.types";
import { isPremiumRole } from "../utils/is-premium-role.util";

export function exportFormatAccessMiddleware(
	request: Request,
	_response: Response,
	next: NextFunction
) {
	const format = request.locals.exportFormat as ExportFormat;
	const user = request.locals.user as RequestUser;

	if (format === "json" && !isPremiumRole(user.role))
		throw commonDomainError.exportFormatPremium();

	return next();
}
