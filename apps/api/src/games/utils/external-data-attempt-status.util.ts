import { type ExternalDataAttemptStatus } from "../../external-data-attempts/external-data-attempt.model";
import {
	EXTERNAL_DATA_UNRECORDED_FAILURE_CODES,
	EXTERNAL_DATA_UNRECORDED_FAILURE_PREFIX,
	EXTERNAL_DATA_UNRECORDED_FAILURE_SUFFIXES
} from "../games.constants";
import { type ExternalDataResult } from "../games-external-data.interface";

function isFailureOutsideTheGame(errorCode: string | null) {
	if (errorCode === null) return false;
	return (
		(EXTERNAL_DATA_UNRECORDED_FAILURE_CODES as readonly string[]).includes(
			errorCode
		) ||
		errorCode.startsWith(EXTERNAL_DATA_UNRECORDED_FAILURE_PREFIX) ||
		EXTERNAL_DATA_UNRECORDED_FAILURE_SUFFIXES.some(suffix =>
			errorCode.endsWith(suffix)
		)
	);
}

export function externalDataAttemptStatus(
	result: ExternalDataResult
): ExternalDataAttemptStatus | "updated" | null {
	if (result.status === "failed" && isFailureOutsideTheGame(result.errorCode))
		return null;
	return result.status;
}
