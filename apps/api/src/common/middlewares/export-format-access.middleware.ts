import { type NextFunction, type Request, type Response } from "express";

import { resolvePremiumAccess } from "../../premium-access/premium-access.service";
import * as commonDomainError from "../errors/common.domain-error";
import { type RequestUser } from "../interfaces/request-user.interface";
import { type ExportFormat } from "../types/export-format.types";

export async function exportFormatAccessMiddleware(
	request: Request,
	_response: Response,
	next: NextFunction
) {
	const format = request.locals.exportFormat as ExportFormat;
	const user = request.locals.user as RequestUser;

	if (format === "json") {
		const premiumAccess = await resolvePremiumAccess(user, "export.json");
		if (!premiumAccess.allowed)
			throw commonDomainError.exportFormatPremium();
	}

	return next();
}
