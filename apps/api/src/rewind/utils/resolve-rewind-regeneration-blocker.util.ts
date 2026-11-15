import {
	type RewindPremiumAccessKind,
	type RewindRegenerationBlocker
} from "../rewind.constants";
import { type RewindAiBudget } from "../rewind-generation.interface";
import { type RewindCalendar } from "../rewind-run.interface";
import { resolveRewindGenerationBlocker } from "./resolve-rewind-generation-blocker.util";

export function resolveRewindRegenerationBlocker(
	year: number,
	calendar: Pick<RewindCalendar, "today" | "edition">,
	accessKind: RewindPremiumAccessKind | null,
	budget: Pick<RewindAiBudget, "spend">
): RewindRegenerationBlocker | null {
	const generationBlocker = resolveRewindGenerationBlocker(
		year,
		calendar,
		accessKind
	);
	if (generationBlocker) return generationBlocker;
	if (accessKind === null) return "no-ai-access";
	return budget.spend === null ? "no-regenerations-left" : null;
}
