export interface ValidationIssue {
	path: string;
	code: string;
	message: string;
}

export class HttpError extends Error {
	readonly type: string;
	readonly title: string;
	readonly status: number;
	readonly detail?: string;
	readonly instance: string;
	readonly timestamp: Date;
	readonly correlationId: string;
	readonly context?: Record<string, unknown>;
	readonly issues?: ValidationIssue[];

	constructor(httpErrorOptions: HttpErrorOptions) {
		super(httpErrorOptions.title);
		this.name = "HTTP_ERROR";
		this.type = httpErrorOptions.type;
		this.title = httpErrorOptions.title;
		this.status = httpErrorOptions.status;
		this.detail = httpErrorOptions.detail;
		this.instance = httpErrorOptions.instance;
		this.timestamp = httpErrorOptions.timestamp;
		this.correlationId = httpErrorOptions.correlationId;
		this.context = httpErrorOptions.context;
		this.issues = httpErrorOptions.issues;
	}
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
