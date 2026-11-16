import { type RewindGenerationAttempt } from "../rewind-generation.interface";
import { type RewindGenerationPlan } from "../rewind-generation.types";
import { resolveFirstGenerationAiBudget } from "./resolve-first-generation-ai-budget.util";
import { resolveRewindAiBudget } from "./resolve-rewind-ai-budget.util";

function matchesGeneratedAt(expected: string | null, generatedAt: Date) {
	return (
		expected !== null &&
		new Date(expected).getTime() === generatedAt.getTime()
	);
}

export function planRewindGeneration({
	year,
	record,
	expectedGeneratedAt,
	calendar,
	accessKind
}: RewindGenerationAttempt): RewindGenerationPlan {
	if (!record)
		return expectedGeneratedAt === null
			? {
					kind: "create",
					budget: resolveFirstGenerationAiBudget(
						year,
						calendar,
						accessKind
					)
				}
			: { kind: "conflict" };

	if (!matchesGeneratedAt(expectedGeneratedAt, record.generatedAt))
		return { kind: "conflict" };

	if (accessKind === null) return { kind: "premium-required" };

	const budget = resolveRewindAiBudget(record, calendar, accessKind);
	if (budget.spend === null) return { kind: "limit-reached" };

	return { kind: "regenerate", budget };
}
