import { HttpContextToken, HttpErrorResponse } from "@angular/common/http";

export interface ServerValidationIssue {
	path: string;
	code: string;
	message: string;
}

export const SUPPRESS_VALIDATION_TOAST = new HttpContextToken<boolean>(
	() => false
);

function getIssues(err: unknown): ServerValidationIssue[] {
	const body = (err as HttpErrorResponse | undefined)?.error;
	if (body?.type !== "COMMON_SCHEMA_INVALID") return [];
	return Array.isArray(body.issues) ? body.issues : [];
}

export function fieldErrorsFromResponse(err: unknown): Record<string, string> {
	const map: Record<string, string> = {};
	for (const issue of getIssues(err)) {
		const key = issue.path || "_";
		if (!map[key]) map[key] = issue.message;
	}
	return map;
}

export function validationSummary(err: unknown): string | null {
	const issues = getIssues(err);
	if (issues.length === 0) return null;
	return issues.map(issue => issue.message).join(" · ");
}
