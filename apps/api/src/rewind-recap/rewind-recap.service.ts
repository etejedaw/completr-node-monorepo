import { environmentConfig } from "../common/config/environment.config";
import { iaProvider } from "../ia/ia.provider";
import { type RewindLanguage } from "../rewind/rewind.constants";
import { type RewindAiRecap } from "../rewind/rewind.interface";
import { resolveRewindToday } from "../rewind/utils/resolve-rewind-today.util";
import { type RewindRecapInput } from "./rewind-recap.interface";
import { buildRewindRecapInstructions } from "./rewind-recap.prompt";
import { RewindAiRecapSchema } from "./schemas/rewind-ai-recap.schema";
import { buildRewindRecapContent } from "./utils/build-rewind-recap-content.util";
import { fixSpanishImperativeAccents } from "./utils/fix-spanish-imperative-accents.util";

const REWIND_AI_RECAP_REQUEST = {
	schemaName: "rewind_ai_recap",
	maxTokens: 3000,
	temperature: 0.5,
	timeoutMs: 25_000
};

function rewindTodayOverride(): string | undefined {
	return environmentConfig.NODE_ENV === "prod"
		? undefined
		: environmentConfig.REWIND_TODAY;
}

function cleanText(language: RewindLanguage) {
	return (text: string) => {
		const trimmed = text.trim();
		return language === "es"
			? fixSpanishImperativeAccents(trimmed)
			: trimmed;
	};
}

function cleanRecap(
	recap: RewindAiRecap,
	language: RewindLanguage
): RewindAiRecap {
	const clean = cleanText(language);
	return {
		headline: clean(recap.headline),
		summary: clean(recap.summary),
		insights: recap.insights.map(insight => ({
			kind: insight.kind,
			title: clean(insight.title),
			body: clean(insight.body)
		})),
		funFact: clean(recap.funFact),
		nextYearChallenge: clean(recap.nextYearChallenge)
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
	return cleanRecap(recap, input.language);
}
