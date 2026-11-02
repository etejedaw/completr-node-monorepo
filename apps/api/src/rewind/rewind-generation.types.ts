export type RewindGenerationPlan =
	| { kind: "create" }
	| { kind: "regenerate"; spendsGrace: boolean }
	| { kind: "conflict" }
	| { kind: "limit-reached" };
