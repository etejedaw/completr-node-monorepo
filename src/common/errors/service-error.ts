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
	internalError?: InternalError;
	networkError?: NetworkError;
}

interface ExternalError {
	service: string;
	url: string;
	method: string;
	statusCode: number;
	requestBody?: unknown;
	responseBody?: unknown;
}

interface InternalError {
	message?: string;
	context?: Record<string, unknown>;
}

interface NetworkError {
	url?: string;
	message?: string;
}
