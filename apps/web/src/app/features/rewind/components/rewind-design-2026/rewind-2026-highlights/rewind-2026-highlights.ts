import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import { RouterLink } from "@angular/router";

import {
	type RewindFinishedGame,
	type RewindHighlights,
	type RewindLanguage
} from "../../../../../core/models/rewind.model";
import { CoverUrlPipe } from "../../../../../shared/pipes/cover-url";
import { UiEyebrow } from "../../../../../shared/ui";
import { gameArtUrl } from "../../../../../shared/utils/game-art";
import {
	formatHours,
	formatRewindNumber,
	monthName,
	monthRange,
	rewindCopy,
	shortDate,
	spokenMonthRange
} from "../../../rewind-copy";
import { type RewindHighlightsCopy } from "../../../rewind-copy.model";
import { RewindReveal } from "../../../rewind-reveal";
import {
	type HighlightRecord,
	type HighlightStat,
	type RankedEntry
} from "./rewind-2026-highlights.model";

const REVEAL_STAGGER_MS = 60;
const RECORD_COLUMNS = 3;

function isSameGame(
	first: RewindFinishedGame | null,
	last: RewindFinishedGame | null
): boolean {
	return !!first && !!last && first.gameId === last.gameId;
}

function lastFinishedOf(highlights: RewindHighlights) {
	return isSameGame(highlights.firstFinished, highlights.lastFinished)
		? null
		: highlights.lastFinished;
}

function recordsOf(
	highlights: RewindHighlights,
	language: RewindLanguage
): HighlightRecord[] {
	const text = rewindCopy(language).highlights;
	const records: (HighlightRecord | null)[] = [
		bestRatioRecord(highlights, text, language),
		durationRecord("longest", highlights.longest, text, language),
		durationRecord("fastest", highlights.fastest, text, language),
		dateRecord(
			"firstFinished",
			text.firstOfYear,
			highlights.firstFinished,
			language
		),
		dateRecord(
			"lastFinished",
			text.lastOfYear,
			lastFinishedOf(highlights),
			language
		),
		classicRecord(highlights, text)
	];
	return records.filter(record => record !== null);
}

function bestRatioRecord(
	highlights: RewindHighlights,
	text: RewindHighlightsCopy,
	language: RewindLanguage
): HighlightRecord | null {
	const game = highlights.bestRatio;
	if (!game) return null;
	return {
		key: "bestRatio",
		label: text.bestValue,
		value: formatRewindNumber(game.personalRatio, language),
		unit: null,
		hasLongUnit: false,
		code: game.code,
		title: game.title,
		artUrl: gameArtUrl(game, "landscape")
	};
}

function durationRecord(
	key: "longest" | "fastest",
	game: RewindHighlights["longest"],
	text: RewindHighlightsCopy,
	language: RewindLanguage
): HighlightRecord | null {
	if (!game) return null;
	return {
		key,
		label: text[key],
		value: formatHours(game.hours, language),
		unit: text.hoursSuffix(game.isEstimate),
		hasLongUnit: game.isEstimate,
		code: game.code,
		title: game.title,
		artUrl: gameArtUrl(game, "landscape")
	};
}

function dateRecord(
	key: "firstFinished" | "lastFinished",
	label: string,
	game: RewindFinishedGame | null,
	language: RewindLanguage
): HighlightRecord | null {
	if (!game) return null;
	return {
		key,
		label,
		value: shortDate(game.finishedAt, language),
		unit: null,
		hasLongUnit: false,
		code: game.code,
		title: game.title,
		artUrl: gameArtUrl(game, "landscape")
	};
}

function classicRecord(
	highlights: RewindHighlights,
	text: RewindHighlightsCopy
): HighlightRecord | null {
	const game = highlights.classic;
	if (!game) return null;
	return {
		key: "classic",
		label: text.classic,
		value: String(game.releaseYear),
		unit: null,
		hasLongUnit: false,
		code: game.code,
		title: game.title,
		artUrl: gameArtUrl(game, "landscape")
	};
}

function rankedStat(
	key: "topGenres" | "topPlatforms",
	label: string,
	entries: RankedEntry[],
	countLabel: (count: number) => string
): HighlightStat | null {
	const [top, ...rest] = entries;
	if (!top) return null;
	const visualParts = [
		String(top.count),
		...rest.map(entry => `${entry.shortName} ${entry.count}`)
	];
	const spokenParts = [
		countLabel(top.count),
		...rest.map(entry => `${entry.name} ${countLabel(entry.count)}`)
	];
	return {
		key,
		label,
		value: top.name,
		detail: visualParts.join(" · "),
		spokenDetail: spokenParts.join(", ")
	};
}

function statsOf(
	highlights: RewindHighlights,
	language: RewindLanguage
): HighlightStat[] {
	const text = rewindCopy(language).highlights;
	const { longestStreak, busiestMonth } = highlights;
	const stats: (HighlightStat | null)[] = [
		longestStreak
			? {
					key: "longestStreak",
					label: text.longestStreak,
					value: `${longestStreak.months}${text.monthsInARow}`,
					detail: monthRange(
						longestStreak.fromMonth,
						longestStreak.toMonth,
						language
					),
					spokenDetail: spokenMonthRange(
						longestStreak.fromMonth,
						longestStreak.toMonth,
						language
					)
				}
			: null,
		busiestMonth
			? {
					key: "busiestMonth",
					label: text.busiestMonth,
					value: monthName(busiestMonth.month, language),
					detail: text.gamesFinished(busiestMonth.count),
					spokenDetail: null
				}
			: null,
		rankedStat(
			"topGenres",
			text.topGenres,
			highlights.topGenres.map(genre => ({
				name: genre.name,
				shortName: genre.name,
				count: genre.count
			})),
			text.games
		),
		rankedStat(
			"topPlatforms",
			text.platforms,
			highlights.topPlatforms.map(platform => ({
				name: platform.name,
				shortName: platform.abbreviation || platform.name,
				count: platform.count
			})),
			text.runs
		)
	];
	return stats.filter(stat => stat !== null);
}

export function hasRewind2026Highlights(highlights: RewindHighlights): boolean {
	return (
		recordsOf(highlights, "en").length > 0 ||
		statsOf(highlights, "en").length > 0
	);
}

@Component({
	selector: "app-rewind-2026-highlights",
	imports: [CoverUrlPipe, RewindReveal, RouterLink, UiEyebrow],
	templateUrl: "./rewind-2026-highlights.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Rewind2026Highlights {
	readonly highlights = input.required<RewindHighlights>();
	readonly language = input<RewindLanguage>("en");

	protected readonly records = computed(() =>
		recordsOf(this.highlights(), this.language())
	);
	protected readonly stats = computed(() =>
		statsOf(this.highlights(), this.language())
	);

	protected revealDelay(index: number): number {
		return (index % RECORD_COLUMNS) * REVEAL_STAGGER_MS;
	}
}
