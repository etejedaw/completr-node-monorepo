import { ServiceError } from "../../common/errors/service-error";
import { type ExternalDataErrorOutcome } from "../games-external-data.types";

interface RequestFailureDetail {
	status?: unknown;
	retryAfterMs?: unknown;
}

function readRequestFailureDetail(error: unknown) {
	if (!(error instanceof ServiceError)) return {};
	const raw = error.serviceError.raw;
	if (typeof raw !== "object" || raw === null) return {};

	const { status, retryAfterMs } = raw as RequestFailureDetail;
	return {
		...(typeof status === "number" ? { httpStatus: status } : {}),
		...(typeof retryAfterMs === "number"
			? { retryAfterSeconds: Math.ceil(retryAfterMs / 1000) }
			: {})
	};
}

export function classifyExternalDataError(
	error: unknown
): ExternalDataErrorOutcome {
	const code = error instanceof ServiceError ? error.code : null;
	if (code?.endsWith("_NOT_FOUND"))
		return { status: "not_found", errorCode: null };
	return {
		status: "failed",
		errorCode: code,
		...readRequestFailureDetail(error)
	};
}
