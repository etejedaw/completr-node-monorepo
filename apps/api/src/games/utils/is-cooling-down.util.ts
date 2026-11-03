import { EXTERNAL_DATA_RETRY_COOLDOWN_MS } from "../games.constants";
import { type ExternalDataAttemptRecord } from "../games-external-data.interface";

export function isCoolingDown(
	attempt: ExternalDataAttemptRecord | undefined,
	now: Date
) {
	if (!attempt) return false;
	const elapsedMs = now.getTime() - attempt.attemptedAt.getTime();
	return elapsedMs < EXTERNAL_DATA_RETRY_COOLDOWN_MS[attempt.status];
}
