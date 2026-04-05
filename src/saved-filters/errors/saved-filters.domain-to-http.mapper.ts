import { DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";
import { CustomRequest } from "../../common/interfaces/custom-request.interface";

export function savedFiltersDomainToHttpMapper(
	error: DomainError,
	request: CustomRequest
): HttpError {
	const baseOptions = {
		type: error.code,
		title: error.message,
		instance: request.originalUrl,
		timestamp: new Date(),
		correlationId: request.correlationId,
		context: error.context
	};

	if (error.code === "SAVED_FILTER_NOT_FOUND")
		return new HttpError({ ...baseOptions, status: 404 });

	if (error.code === "SAVED_FILTER_FORBIDDEN")
		return new HttpError({ ...baseOptions, status: 403 });

	if (error.code === "SAVED_FILTER_LIMIT_REACHED")
		return new HttpError({ ...baseOptions, status: 403 });

	return new HttpError({ ...baseOptions, status: 500 });
}
