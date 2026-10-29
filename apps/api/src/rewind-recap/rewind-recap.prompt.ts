import {
	type RewindInsightKind,
	type RewindLanguage
} from "../rewind/rewind.constants";
import {
	REWIND_AI_RECAP_INSIGHT_COUNT,
	REWIND_AI_RECAP_LIMITS
} from "./schemas/rewind-ai-recap.schema";
import { REWIND_RECAP_MAX_GAME_ROWS } from "./utils/build-rewind-recap-content.util";

const OUTPUT_LANGUAGES: Record<RewindLanguage, string> = {
	en: "English",
	es: "neutral Latin American Spanish (use tú, never vos or vosotros, and avoid slang specific to Spain or to a single country)"
};

export const REWIND_INSIGHT_DEFINITIONS: Record<RewindInsightKind, string> = {
	"taste-vs-critics":
		"where the player's userRating differs most from the criticScore, for better or worse",
	"genre-pattern": "a dominant genre or a streak of games from one genre",
	"seasonal-rhythm":
		"which months they played the most, or what they played in each part of the year",
	"finish-discipline":
		"finished versus abandoned games: what they dropped and when",
	"long-vs-short": "whether it was a year of long games or short ones",
	"platform-habit": "a dominant platform or a switch between platforms",
	"backlog-comeback":
		"a game that sat in the backlog for a long time, or was started years before and was finally finished"
};

function describeInsightCatalog(): string {
	return Object.entries(REWIND_INSIGHT_DEFINITIONS)
		.map(([kind, definition]) => `- "${kind}": ${definition}`)
		.join("\n");
}

function describeFieldLimits(): string {
	const limits = REWIND_AI_RECAP_LIMITS;
	return [
		`- "headline": the one sentence that sums up the year. At most ${limits.headline.prompt} characters.`,
		`- "summary": 2 or 3 short paragraphs separated by "\\n\\n". At most ${limits.summary.prompt} characters in total.`,
		`- "insights": exactly ${REWIND_AI_RECAP_INSIGHT_COUNT} items, each with a different "kind" from the catalog below, a "title" of at most ${limits.insightTitle.prompt} characters and a "body" of at most ${limits.insightBody.prompt} characters.`,
		`- "funFact": one curious fact taken from the data. At most ${limits.funFact.prompt} characters.`,
		`- "nextYearChallenge": a friendly challenge for next year based on their data. At most ${limits.nextYearChallenge.prompt} characters.`
	].join("\n");
}

export function buildRewindRecapInstructions(language: RewindLanguage): string {
	return `You are a fellow gamer looking back on a friend's year in video games with humor and warmth. You are not an analyst writing a report. Talk to the player directly in the second person ("you" in English, "tú" in Spanish).

Write every text value in ${OUTPUT_LANGUAGES[language]}. Keep game titles exactly as given.

Rules:
- Use only the data you are given. Never invent games, numbers or dates.
- Every number you mention must come from the data.
- No plot spoilers.
- Never judge negatively. An abandoned game means they know what they don't want.
- Never mention a rating like "5/5" without context.
- No markdown and no emojis.
- Use careful spelling, accents and punctuation for the output language.
- Respect the character limits below; they are hard limits.
- Reply only with the requested JSON object, with no text before or after it.

JSON fields:
${describeFieldLimits()}

Insight catalog. Pick the ${REWIND_AI_RECAP_INSIGHT_COUNT} different kinds best supported by the data:
${describeInsightCatalog()}

Input data, sent as JSON:
- "year": the year being recapped. "persona": a code that labels the player's style that year.
- "totals": counts for the year. "finished" and "abandoned" are distinct games closed that year, "started" are games started that year, "hoursPlayed" sums finished and abandoned games, "finishRate" is a percentage from 0 to 100, "averageRating" goes from 0 to 5, "platinums" may be null when unknown.
- "highlights": the standout games, genres, platforms and months. Months are numbers from 1 to 12.
- "previousYear": the same totals for the year before, or null when there is no previous year to compare.
- "games": a table with "columns" and "rows"; each row lists its values in the order of "columns". "total" counts every game active that year, "included" counts the rows sent and "truncated" is true when rows were left out (at most ${REWIND_RECAP_MAX_GAME_ROWS}).
  - "title": the game. "status": not_started, playing, completed, abandoned or endless. "startedAt" and "finishedAt": dates as YYYY-MM-DD, or null.
  - "platform": platform abbreviation. "genres": genre names joined by "/".
  - "hours": hours played; "hoursEstimated" is true when it is an estimate of the game's length rather than the real time played.
  - "userRating": the player's own rating from 0 to 5. "criticScore": the critics' score from 0 to 5. Either may be null.`;
}
