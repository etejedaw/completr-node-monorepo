import { type NextFunction, type Request, type Response } from "express";

import { environmentConfig } from "../config/environment.config";
import { globalErrorDomainNormalizer } from "../errors/global-error-domain.normalizer";
import { globalErrorHttpNormalizer } from "../errors/global-error-http.normalizer";
import { ServiceError } from "../errors/service-error";
import { PinoLogger } from "../logger/pino.logger";
import { describeFailure } from "../utils/describe-failure.util";

const logger = new PinoLogger("ErrorHandler");

const SERVER_ERROR_STATUS = 500;
const EXPECTED_CLIENT_ERROR_STATUSES = new Set([401, 403, 404, 429]);

function routeOf(request: Request) {
	return (request.originalUrl ?? "").split("?")[0];
}

function originalCauseOf(error: Error) {
	if (
		error instanceof ServiceError &&
		error.serviceError.raw instanceof Error
	)
		return error.serviceError.raw;
	return error;
}

function logHandledError(
	error: Error,
	request: Request,
	status: number,
	code: string,
	correlationId: string
) {
	const isServerError = status >= SERVER_ERROR_STATUS;
	if (!isServerError && EXPECTED_CLIENT_ERROR_STATUSES.has(status)) return;

	const extra = {
		correlationId,
		method: request.method,
		route: routeOf(request),
		status,
		code,
		cause: describeFailure(error),
		...(isServerError && { stack: originalCauseOf(error).stack })
	};
	if (isServerError) logger.error("request", "failed", extra);
	else logger.warn("request", "rejected", extra);
}

export function errorHandlerMiddleware(
	error: Error,
	request: Request,
	response: Response,
	_next: NextFunction
) {
	const correlationId = (request.locals?.correlationId as string) ?? "";

	const domainError = globalErrorDomainNormalizer(error, correlationId);
	const httpError = globalErrorHttpNormalizer(domainError, request);

	logHandledError(
		error,
		request,
		httpError.status,
		httpError.type,
		correlationId
	);

	return response.status(httpError.status).json({
		correlationId: httpError.correlationId,
		type: httpError.type,
		title: httpError.title,
		status: httpError.status,
		detail: httpError.detail,
		instance: httpError.instance,
		timestamp: httpError.timestamp,
		...(httpError.issues && { issues: httpError.issues }),
		...(environmentConfig.NODE_ENV !== "prod" && {
			context: httpError.context
		})
	});
}
