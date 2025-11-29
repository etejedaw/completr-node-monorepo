import { Request, Response, NextFunction } from "express";
import { CustomRequest } from "../interfaces/custom-request.interface";
import { globalErrorDomainNormalizer } from "../errors/global-error-domain.normalizer";
import { globalErrorHttpNormalizer } from "../errors/global-error-http.normalizer";

export function errorHandlerMiddleware(
	error: Error,
	request: Request,
	response: Response,
	_next: NextFunction
) {
	const customRequest = request as CustomRequest;
	const { correlationId } = customRequest;
	const domainError = globalErrorDomainNormalizer(error, correlationId);
	const httpError = globalErrorHttpNormalizer(domainError, customRequest);

	return response.status(httpError.status).json({
		correlationId: httpError.correlationId,
		type: httpError.type,
		title: httpError.title,
		status: httpError.status,
		detail: httpError.detail,
		instance: httpError.instance,
		timestamp: httpError.timestamp,
		context: httpError.context
	});
}
