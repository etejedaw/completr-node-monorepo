import { type Rewind } from "../rewind.interface";
import { type RewindRecord } from "../rewind-record.interface";
import { type RewindStoredView } from "../rewind-record.types";
import { hasPremiumContent } from "./has-premium-content.util";

export function toRewindStoredView(
	record: RewindRecord,
	ownerControls: Rewind["ownerControls"]
): RewindStoredView {
	return {
		language: record.language,
		generatedAt: record.generatedAt.toISOString(),
		frozenAt: record.frozenAt?.toISOString() ?? null,
		aiRecap: record.aiRecapStatus === "ready" ? record.aiRecap : null,
		premiumStats: record.premiumStats,
		premiumAccessKind: hasPremiumContent(record)
			? record.premiumAccessKind
			: null,
		ownerControls
	};
}
