import { Request, Response, NextFunction } from "express";
import { globalErrorDomainNormalizer } from "../errors/global-error-domain.normalizer";
import { globalErrorHttpNormalizer } from "../errors/global-error-http.normalizer";
import { environmentConfig } from "../config/environment.config";

export function errorHandlerMiddleware(
	error: Error,
	request: Request,
	response: Response,
	_next: NextFunction
) {
	const correlationId = (request.locals?.correlationId as string) ?? "";

	const domainError = globalErrorDomainNormalizer(error, correlationId);
	const httpError = globalErrorHttpNormalizer(domainError, request);

	return response.status(httpError.status).json({
		correlationId: httpError.correlationId,
		type: httpError.type,
		title: httpError.title,
		status: httpError.status,
		detail: httpError.detail,
		instance: httpError.instance,
		timestamp: httpError.timestamp,
		...(httpError.issues && { issues: httpError.issues }),
		...(environmentConfig.NODE_ENV !== "prd" && {
			context: httpError.context
		})
	});
}
