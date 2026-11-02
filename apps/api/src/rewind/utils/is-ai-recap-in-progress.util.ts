import { REWIND_AI_RECAP_PENDING_TIMEOUT_MS } from "../rewind.constants";
import { type RewindRecord } from "../rewind-record.interface";

export function isAiRecapInProgress(
	record: Pick<RewindRecord, "aiRecapStatus" | "aiRecapRequestedAt">,
	now: Date
): boolean {
	if (record.aiRecapStatus !== "pending" || !record.aiRecapRequestedAt)
		return false;
	const elapsed = now.getTime() - record.aiRecapRequestedAt.getTime();
	return elapsed < REWIND_AI_RECAP_PENDING_TIMEOUT_MS;
}
