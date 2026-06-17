import { Request } from "express";
import { DomainError } from "../../common/errors/domain-error";
import { HttpError, ValidationIssue } from "../../common/errors/http-error";

export function commonDomainToHttpMapper(
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

	if (error.code === "COMMON_SCHEMA_INVALID") {
		const issues = error.context?.["issues"] as
			| ValidationIssue[]
			| undefined;
		return new HttpError({ ...baseOptions, status: 422, issues });
	}

	return new HttpError({ ...baseOptions, status: 500 });
}
