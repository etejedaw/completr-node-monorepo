import { type RewindAiRecapState } from "../rewind.interface";
import { type RewindRecord } from "../rewind-record.interface";

export function resolveAiRecapState(
	record: Pick<RewindRecord, "aiRecap" | "aiRecapStatus">,
	ownerIsPremium: boolean
): RewindAiRecapState {
	if (record.aiRecapStatus === "ready" && record.aiRecap) return "ready";
	if (record.aiRecapStatus === "failed" || record.aiRecapStatus === "pending")
		return "failed";
	return ownerIsPremium ? "available" : "unavailable";
}
