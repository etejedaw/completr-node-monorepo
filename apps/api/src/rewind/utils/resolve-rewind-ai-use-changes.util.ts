import {
	type RewindAiBudget,
	type RewindAiUseChanges
} from "../rewind-generation.interface";
import { type RewindAiBudgetRecord } from "../rewind-generation.types";

export function resolveRewindAiUseChanges(
	record: Pick<RewindAiBudgetRecord, "graceUsed" | "premiumAccessKind">,
	budget: Pick<RewindAiBudget, "assignment" | "regenerationsLeft" | "spend">
): RewindAiUseChanges {
	const spendsRegeneration = budget.spend === "regeneration";
	return {
		premiumAccessKind:
			budget.assignment?.premiumAccessKind ?? record.premiumAccessKind,
		regenerationsLeft:
			budget.regenerationsLeft - (spendsRegeneration ? 1 : 0),
		graceUsed: record.graceUsed || budget.spend === "grace"
	};
}
