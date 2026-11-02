import { ServiceError } from "../../common/errors/service-error";
import { type ExternalDataErrorOutcome } from "../games-external-data.types";

export function classifyExternalDataError(
	error: unknown
): ExternalDataErrorOutcome {
	const code = error instanceof ServiceError ? error.code : null;
	if (code?.endsWith("_NOT_FOUND"))
		return { status: "not_found", errorCode: null };
	return { status: "failed", errorCode: code };
}
