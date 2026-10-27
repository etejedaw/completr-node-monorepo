import { type NextFunction, type Request, type Response } from "express";

import * as commonDomainError from "../errors/common.domain-error";
import { type ExportFormat } from "../interfaces/export-format.interface";

const EXPORT_FORMAT_BY_MEDIA_TYPE: Record<string, ExportFormat> = {
	"text/csv": "csv",
	"application/json": "json"
};

export function exportFormatNegotiationMiddleware(
	request: Request,
	response: Response,
	next: NextFunction
) {
	response.vary("Accept");

	const acceptedMediaType = request.accepts(
		Object.keys(EXPORT_FORMAT_BY_MEDIA_TYPE)
	);
	if (!acceptedMediaType) throw commonDomainError.exportFormatNotAcceptable();

	request.locals = {
		...request.locals,
		exportFormat: EXPORT_FORMAT_BY_MEDIA_TYPE[acceptedMediaType]
	};
	return next();
}
