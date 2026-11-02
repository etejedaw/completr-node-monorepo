import { REWIND_REGENERATION_LIMIT } from "../rewind.constants";
import { type RewindGenerationAttempt } from "../rewind-generation.interface";
import { type RewindGenerationPlan } from "../rewind-generation.types";
import { isRewindGraceWindow } from "./is-rewind-grace-window.util";

function matchesGeneratedAt(expected: string | null, generatedAt: Date) {
	return (
		expected !== null &&
		new Date(expected).getTime() === generatedAt.getTime()
	);
}

export function planRewindGeneration({
	record,
	expectedGeneratedAt,
	today
}: RewindGenerationAttempt): RewindGenerationPlan {
	if (!record)
		return expectedGeneratedAt === null
			? { kind: "create" }
			: { kind: "conflict" };

	if (!matchesGeneratedAt(expectedGeneratedAt, record.generatedAt))
		return { kind: "conflict" };

	if (!record.graceUsed && isRewindGraceWindow(record.year, today))
		return { kind: "regenerate", spendsGrace: true };

	if (record.regenerationsUsed < REWIND_REGENERATION_LIMIT)
		return { kind: "regenerate", spendsGrace: false };

	return { kind: "limit-reached" };
}
