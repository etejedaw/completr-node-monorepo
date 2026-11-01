import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "HLTB Provider";

export function hltbNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"HLTB_NOT_FOUND",
		"Game not found in HowLongToBeat",
		context
	);
}

export function hltbParseError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"HLTB_PARSE_ERROR",
		"Unexpected HowLongToBeat page structure",
		context
	);
}

export function hltbRateLimited(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"HLTB_RATE_LIMITED",
		"HowLongToBeat rate limit reached",
		context
	);
}

export function hltbBlocked(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"HLTB_BLOCKED",
		"HowLongToBeat blocked the request",
		context
	);
}

export function hltbTimeout(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"HLTB_TIMEOUT",
		"HowLongToBeat request timed out",
		context
	);
}

export function hltbAborted(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"HLTB_ABORTED",
		"HowLongToBeat request was aborted",
		context
	);
}

export function hltbRequestError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"HLTB_REQUEST_ERROR",
		"HowLongToBeat request failed",
		context
	);
}

export function hltbInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"HLTB_INTERNAL_ERROR",
		"Unexpected HLTB Provider error",
		context
	);
}
