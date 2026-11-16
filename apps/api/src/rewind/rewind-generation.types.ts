import { type RewindAiBudget } from "./rewind-generation.interface";
import { type RewindRecord } from "./rewind-record.interface";

export type RewindAiSpend = "grace" | "regeneration";

export type RewindAiBudgetRecord = Pick<
	RewindRecord,
	"year" | "graceUsed" | "regenerationsLeft" | "premiumAccessKind"
>;

export type RewindGenerationPlan =
	| { kind: "create"; budget: RewindAiBudget }
	| { kind: "regenerate"; budget: RewindAiBudget }
	| { kind: "conflict" }
	| { kind: "premium-required" }
	| { kind: "limit-reached" };
