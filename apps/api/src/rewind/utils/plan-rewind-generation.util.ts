import { REWIND_REGENERATION_LIMIT } from "../rewind.constants";
import { type RewindRecord } from "../rewind-record.interface";
import { isRewindGraceWindow } from "./is-rewind-grace-window.util";

export type RewindGenerationPlan =
	| { kind: "create" }
	| { kind: "regenerate"; spendsGrace: boolean }
	| { kind: "conflict" }
	| { kind: "limit-reached" };

export interface RewindGenerationAttempt {
	record: Pick<
		RewindRecord,
		"year" | "generatedAt" | "regenerationsUsed" | "graceUsed"
	> | null;
	expectedGeneratedAt: string | null;
	today: Date;
}

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
