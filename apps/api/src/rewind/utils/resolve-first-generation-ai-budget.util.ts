import { type RewindPremiumAccessKind } from "../rewind.constants";
import { type RewindAiBudget } from "../rewind-generation.interface";
import { type RewindCalendar } from "../rewind-run.interface";
import { resolveRewindAiBudget } from "./resolve-rewind-ai-budget.util";

export function resolveFirstGenerationAiBudget(
	year: number,
	calendar: Pick<RewindCalendar, "today" | "edition">,
	accessKind: RewindPremiumAccessKind | null
): RewindAiBudget {
	return resolveRewindAiBudget(
		{
			year,
			graceUsed: false,
			regenerationsLeft: 0,
			premiumAccessKind: null
		},
		calendar,
		accessKind
	);
}
