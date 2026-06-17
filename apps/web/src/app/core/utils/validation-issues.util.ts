import { HttpContextToken, HttpErrorResponse } from "@angular/common/http";

export interface ValidationIssue {
	path: string;
	code: string;
	message: string;
}

export const SUPPRESS_VALIDATION_TOAST = new HttpContextToken<boolean>(
	() => false
);

export function extractValidationIssues(
	err: unknown
): ValidationIssue[] | null {
	if (!(err instanceof HttpErrorResponse)) return null;
	if (err.status !== 422) return null;
	const issues = err.error?.issues;
	if (!Array.isArray(issues) || issues.length === 0) return null;
	return issues as ValidationIssue[];
}

export function formatValidationIssues(err: unknown): string | null {
	const issues = extractValidationIssues(err);
	if (!issues) return null;
	return issues
		.map(i => (i.path ? `${i.path}: ${i.message}` : i.message))
		.join("\n");
}
