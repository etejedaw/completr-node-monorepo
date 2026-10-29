import { REWIND_REGENERATION_LIMIT } from "../rewind.constants";
import { type RewindOwnerControls } from "../rewind.interface";
import { type RewindRecord } from "../rewind-record.interface";
import { resolveAiRecapState } from "./resolve-ai-recap-state.util";
import { resolveGraceEndsAt } from "./resolve-grace-ends-at.util";

export function buildRewindOwnerControls(
	record: RewindRecord,
	today: Date,
	ownerIsPremium: boolean
): RewindOwnerControls {
	const regenerationsLeft = Math.max(
		0,
		REWIND_REGENERATION_LIMIT - record.regenerationsUsed
	);
	const graceEndsAt = resolveGraceEndsAt(record, today);

	return {
		includesPrivateRuns: record.includesPrivateRuns,
		includesNotes: record.includesNotes,
		regenerationsLeft,
		graceEndsAt,
		canRegenerate: graceEndsAt !== null || regenerationsLeft > 0,
		aiRecapState: resolveAiRecapState(record, ownerIsPremium)
	};
}
