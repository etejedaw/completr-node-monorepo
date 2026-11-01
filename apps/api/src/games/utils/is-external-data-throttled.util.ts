import { EXTERNAL_DATA_THROTTLE_SUFFIXES } from "../games.constants";
import { type ExternalDataResult } from "../games-external-data.interface";

export function isExternalDataThrottled(result: ExternalDataResult) {
	return (
		result.status === "failed" &&
		EXTERNAL_DATA_THROTTLE_SUFFIXES.some(suffix =>
			result.errorCode?.endsWith(suffix)
		)
	);
}
