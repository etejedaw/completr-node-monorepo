import { type Request } from "express";

import { type DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";

export function hltbDomainToHttpMapper(
	error: DomainError,
	request: Request
): HttpError {
	const baseOptions = {
		type: error.code,
		title: error.message,
		instance: request.originalUrl,
		timestamp: new Date(),
		correlationId: request.locals?.correlationId as string,
		context: error.context
	};

	if (error.code === "HLTB_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "HLTB_RATE_LIMITED")
		return new HttpError({ ...baseOptions, status: 429 });

	if (
		error.code === "HLTB_REQUEST_ERROR" ||
		error.code === "HLTB_PARSE_ERROR" ||
		error.code === "HLTB_BLOCKED"
	)
		return new HttpError({ ...baseOptions, status: 502 });

	if (error.code === "HLTB_TIMEOUT" || error.code === "HLTB_ABORTED")
		return new HttpError({ ...baseOptions, status: 504 });

	return new HttpError({ ...baseOptions, status: 500 });
}
