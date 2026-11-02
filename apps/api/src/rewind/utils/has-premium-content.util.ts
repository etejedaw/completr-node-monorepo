import { type RewindRecord } from "../rewind-record.interface";

export function hasPremiumContent(
	record: Pick<RewindRecord, "aiRecap" | "aiRecapStatus" | "premiumStats">
): boolean {
	const hasReadyRecap = record.aiRecapStatus === "ready" && !!record.aiRecap;
	return hasReadyRecap || record.premiumStats !== null;
}
