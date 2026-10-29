import z from "zod";

import { REWIND_INSIGHT_KINDS } from "../../rewind/rewind.constants";
import { type RewindAiRecap } from "../../rewind/rewind.interface";

export const REWIND_AI_RECAP_INSIGHT_COUNT = 3;

export const REWIND_AI_RECAP_SUMMARY_PARAGRAPHS = 2;

const SUMMARY_PARAGRAPH_SEPARATOR = /\n\s*\n/;

export const REWIND_AI_RECAP_LIMITS = {
	headline: { schema: 100, prompt: 80 },
	summary: { schema: 820, prompt: 580 },
	summaryParagraph: { schema: 400, prompt: 280 },
	insightTitle: { schema: 50, prompt: 40 },
	insightBody: { schema: 300, prompt: 200 },
	funFact: { schema: 200, prompt: 160 },
	nextYearChallenge: { schema: 180, prompt: 140 }
} as const;

function recapText(maxLength: number) {
	return z.string().trim().min(1).max(maxLength);
}

function summaryParagraphs(summary: string): string[] {
	return summary
		.split(SUMMARY_PARAGRAPH_SEPARATOR)
		.map(paragraph => paragraph.trim())
		.filter(Boolean);
}

function fitsSummaryParagraphs(summary: string): boolean {
	const paragraphs = summaryParagraphs(summary);
	return (
		paragraphs.length <= REWIND_AI_RECAP_SUMMARY_PARAGRAPHS &&
		paragraphs.every(
			paragraph =>
				paragraph.length <=
				REWIND_AI_RECAP_LIMITS.summaryParagraph.schema
		)
	);
}

function hasDistinctKinds(insights: { kind: string }[]): boolean {
	return (
		new Set(insights.map(insight => insight.kind)).size === insights.length
	);
}

const RewindInsightSchema = z
	.object({
		kind: z.enum(REWIND_INSIGHT_KINDS),
		title: recapText(REWIND_AI_RECAP_LIMITS.insightTitle.schema),
		body: recapText(REWIND_AI_RECAP_LIMITS.insightBody.schema)
	})
	.strict();

export const RewindAiRecapSchema: z.ZodType<RewindAiRecap> = z
	.object({
		headline: recapText(REWIND_AI_RECAP_LIMITS.headline.schema),
		summary: recapText(REWIND_AI_RECAP_LIMITS.summary.schema).refine(
			fitsSummaryParagraphs,
			{
				message: `summary must have at most ${REWIND_AI_RECAP_SUMMARY_PARAGRAPHS} paragraphs of at most ${REWIND_AI_RECAP_LIMITS.summaryParagraph.schema} characters each`
			}
		),
		insights: z
			.array(RewindInsightSchema)
			.length(REWIND_AI_RECAP_INSIGHT_COUNT)
			.refine(hasDistinctKinds, {
				message: "insight kinds must not repeat"
			}),
		funFact: recapText(REWIND_AI_RECAP_LIMITS.funFact.schema),
		nextYearChallenge: recapText(
			REWIND_AI_RECAP_LIMITS.nextYearChallenge.schema
		)
	})
	.strict();
