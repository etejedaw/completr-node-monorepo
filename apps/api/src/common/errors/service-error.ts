import { type ServiceErrorOptions } from "./errors.interface";

export class ServiceError extends Error {
	constructor(
		readonly code: string,
		readonly serviceError: ServiceErrorOptions
	) {
		super(code, { cause: serviceError.raw });
		this.name = "SERVICE_ERROR";
	}
}
