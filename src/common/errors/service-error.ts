export class ServiceError extends Error {
	constructor(
		readonly code: string,
		readonly serviceError: ServiceErrorOptions
	) {
		super(code, { cause: serviceError.raw });
		this.name = "SERVICE_ERROR";
	}
}
export interface ServiceErrorOptions {
	service: string;
	raw: unknown;
	externalError?: ExternalError;
}

interface ExternalError {
	service: string;
	url: string;
	method: string;
	statusCode: number;
	requestBody?: unknown;
	responseBody?: unknown;
}
