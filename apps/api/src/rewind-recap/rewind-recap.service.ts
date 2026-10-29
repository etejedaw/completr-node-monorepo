import { environmentConfig } from "../common/config/environment.config";
import { iaProvider } from "../ia/ia.provider";
import { type RewindAiRecap } from "../rewind/rewind.interface";
import { resolveRewindToday } from "../rewind/utils/resolve-rewind-today.util";
import { type RewindRecapInput } from "./rewind-recap.interface";
import { buildRewindRecapInstructions } from "./rewind-recap.prompt";
import { RewindAiRecapSchema } from "./schemas/rewind-ai-recap.schema";
import { buildRewindRecapContent } from "./utils/build-rewind-recap-content.util";

const REWIND_AI_RECAP_REQUEST = {
	schemaName: "rewind_ai_recap",
	maxTokens: 1000,
	temperature: 0.5,
	timeoutMs: 25_000
};

function rewindTodayOverride(): string | undefined {
	return environmentConfig.NODE_ENV === "prod"
		? undefined
		: environmentConfig.REWIND_TODAY;
}

function trimRecap(recap: RewindAiRecap): RewindAiRecap {
	return {
		headline: recap.headline.trim(),
		summary: recap.summary.trim(),
		insights: recap.insights.map(insight => ({
			kind: insight.kind,
			title: insight.title.trim(),
			body: insight.body.trim()
		})),
		funFact: recap.funFact.trim(),
		nextYearChallenge: recap.nextYearChallenge.trim()
	};
}

export async function generateRewindAiRecap(
	input: RewindRecapInput
): Promise<RewindAiRecap> {
	const today = resolveRewindToday(rewindTodayOverride(), new Date());
	const recap = await iaProvider.generateJson(RewindAiRecapSchema, {
		...REWIND_AI_RECAP_REQUEST,
		instructions: buildRewindRecapInstructions(input.language),
		content: buildRewindRecapContent(input, today)
	});
	return trimRecap(recap);
}
