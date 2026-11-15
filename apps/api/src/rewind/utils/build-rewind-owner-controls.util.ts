import { type RewindPremiumAccessKind } from "../rewind.constants";
import { type RewindOwnerControls } from "../rewind.interface";
import { type RewindRecord } from "../rewind-record.interface";
import { type RewindCalendar } from "../rewind-run.interface";
import { resolveAiRecapState } from "./resolve-ai-recap-state.util";
import { resolveRewindAiBudget } from "./resolve-rewind-ai-budget.util";
import { resolveRewindPeriod } from "./resolve-rewind-period.util";

export function buildRewindOwnerControls(
	record: RewindRecord,
	calendar: Pick<RewindCalendar, "today" | "edition" | "upcomingEdition">,
	accessKind: RewindPremiumAccessKind | null
): RewindOwnerControls {
	const budget = resolveRewindAiBudget(record, calendar, accessKind);
	const canUseAi = budget.spend !== null;

	return {
		includesPrivateRuns: record.includesPrivateRuns,
		includesNotes: record.includesNotes,
		regenerationsLeft: budget.regenerationsLeft,
		graceEndsAt: budget.graceEndsAt,
		canRegenerate: canUseAi,
		aiRecapState: resolveAiRecapState(record, canUseAi),
		periodOpen: budget.edition !== null,
		periodStatus: resolveRewindPeriod(calendar)?.status ?? "closed",
		closesAt: budget.edition?.closesAt ?? null,
		frozenAt: record.frozenAt?.toISOString() ?? null
	};
}
