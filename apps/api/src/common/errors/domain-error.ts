import {
	type ContextErrorOptions,
	type ValidationIssue
} from "./errors.interface";

export class DomainError extends Error {
	constructor(
		readonly module: string,
		readonly code: string,
		readonly message: string,
		readonly context?: ContextErrorOptions,
		readonly issues?: ValidationIssue[]
	) {
		super(message);
		this.name = "DOMAIN_ERROR";
	}
}
