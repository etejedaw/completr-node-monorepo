import { type ValidationError } from "@angular/forms/signals";

import { NAME_SAFE_TEXT_MESSAGE } from "../../../core/utils/account-fields";
import { PASSWORD_RULES } from "../../../core/utils/password-policy";
import { fieldErrorsFromResponse } from "../../../shared/utils/validation-errors";
import { type FormSnapshot } from "./admin-users.model";

export const NAME_MIN_LENGTH = 4;
export const NAME_MAX_LENGTH = 80;
export const PASSWORD_LENGTH_MESSAGE =
	"Password must be between 8 and 15 characters.";

const COMPOSITION_RULE_MESSAGES: Record<string, string> = {
	lowercase: "Password must contain at least one lowercase letter.",
	uppercase: "Password must contain at least one uppercase letter.",
	number: "Password must contain at least one number.",
	symbol: "Password must contain at least one special character."
};

export function safeTextError(
	value: string
): ValidationError.WithoutFieldTree | null {
	if (!value || !/[<>]/.test(value)) return null;
	return { kind: "unsafeText", message: NAME_SAFE_TEXT_MESSAGE };
}

export function blankTextError(
	value: string
): ValidationError.WithoutFieldTree | null {
	if (!value || value.trim()) return null;
	return { kind: "blankText", message: "Name is required." };
}

export function passwordCompositionError(
	value: string
): ValidationError.WithoutFieldTree | null {
	if (!value) return null;
	const failed = PASSWORD_RULES.find(
		rule => rule.id in COMPOSITION_RULE_MESSAGES && !rule.test(value)
	);
	return failed
		? {
				kind: "passwordComposition",
				message: COMPOSITION_RULE_MESSAGES[failed.id]
			}
		: null;
}

export function serverErrorOutsideFields(
	err: { error?: { detail?: string; title?: string } | null },
	fields: readonly string[],
	fallback: string
): string {
	const issues = Object.entries(fieldErrorsFromResponse(err));
	if (issues.length === 0)
		return err.error?.detail || err.error?.title || fallback;
	return issues
		.filter(([field]) => !fields.includes(field))
		.map(([, message]) => message)
		.join(" · ");
}

export function errorsStillMatching(
	errors: Record<string, string>,
	snapshot: FormSnapshot | null,
	current: FormSnapshot
): Record<string, string> {
	if (!snapshot) return errors;
	return Object.fromEntries(
		Object.entries(errors).filter(
			([field]) => current[field] === snapshot[field]
		)
	);
}

export function editedSince(
	snapshot: FormSnapshot | null,
	current: FormSnapshot
) {
	return (
		!!snapshot &&
		Object.keys(current).some(field => current[field] !== snapshot[field])
	);
}
