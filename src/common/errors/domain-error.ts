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

interface ContextErrorOptions extends Record<string, unknown> {
	correlationId?: string;
}

export interface ValidationIssue {
	path: string;
	code: string;
	message: string;
}
