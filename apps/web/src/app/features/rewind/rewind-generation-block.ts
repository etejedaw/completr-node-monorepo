import {
	type RewindGenerationBlock,
	type RewindLanguage,
	type RewindPeriod,
	type RewindYearSummary
} from "../../core/models/rewind.model";
import { formatRewindDayWithYear } from "./rewind-dates";
import { type RewindGenerationBlockCopy } from "./rewind-generation-block.model";

const REWIND_GENERATION_BLOCK_COPY: Record<
	RewindLanguage,
	RewindGenerationBlockCopy
> = {
	en: {
		requiresPremium:
			"Rewinds of previous years can only be generated with Premium.",
		opensOn: date => `Rewind generation opens on ${date}.`,
		seasonClosed:
			"The Rewind season is closed. Years that weren't generated during it can't be generated anymore."
	},
	es: {
		requiresPremium:
			"Los Rewinds de años anteriores solo se generan con Premium.",
		opensOn: date => `La generación de Rewinds abre el ${date}.`,
		seasonClosed:
			"La temporada del Rewind está cerrada. Los años que no se generaron en ella ya no se pueden generar."
	}
};

export function generationBlockMessageOf(
	summary: Pick<
		RewindYearSummary,
		"isGenerated" | "generationBlockedBy"
	> | null,
	period: RewindPeriod | null,
	language: RewindLanguage
): string | null {
	if (!summary || summary.isGenerated || !summary.generationBlockedBy)
		return null;
	return rewindGenerationBlockMessage(
		summary.generationBlockedBy,
		period,
		language
	);
}

export function rewindGenerationBlockMessage(
	block: RewindGenerationBlock,
	period: RewindPeriod | null,
	language: RewindLanguage
): string {
	const copy = REWIND_GENERATION_BLOCK_COPY[language];
	if (block === "requires-premium") return copy.requiresPremium;
	if (period?.status === "scheduled")
		return copy.opensOn(formatRewindDayWithYear(period.opensAt, language));
	return copy.seasonClosed;
}
