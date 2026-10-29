import { type ServiceError } from "./service-error";

export interface SequelizeErrorMappers {
	unique?: (rawError: unknown) => ServiceError;
	validation?: (rawError: unknown) => ServiceError;
	foreignKey?: (rawError: unknown) => ServiceError;
}

export interface HttpErrorOptions {
	type: string;
	title: string;
	status: number;
	detail?: string;
	instance: string;
	timestamp: Date;
	correlationId: string;
	context?: Record<string, unknown>;
	issues?: ValidationIssue[];
}

export interface ServiceErrorOptions {
	service: string;
	raw: unknown;
	externalError?: ExternalError;
}

export interface ExternalError {
	service: string;
	url: string;
	method: string;
	statusCode: number;
	requestBody?: unknown;
	responseBody?: unknown;
}

export interface ContextErrorOptions extends Record<string, unknown> {
	correlationId?: string;
}

export interface ValidationIssue {
	path: string;
	code: string;
	message: string;
}
