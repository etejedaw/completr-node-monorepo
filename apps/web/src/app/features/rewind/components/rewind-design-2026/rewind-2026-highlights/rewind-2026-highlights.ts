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
	type RewindLanguage,
	type RewindPlatinumGame
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
	type HighlightRecordCell,
	type HighlightStat,
	type PlatinumRecord,
	type RankedEntry
} from "./rewind-2026-highlights.model";
import { Rewind2026PlatinumRecord } from "./rewind-2026-platinum-record/rewind-2026-platinum-record";

const REVEAL_STAGGER_MS = 60;
const WIDE_SPAN_BY_CELLS_IN_ROW: Record<number, string> = {
	1: "lg:col-span-6",
	2: "lg:col-span-3",
	3: "lg:col-span-2"
};

function wideRowSizeOf(count: number): number {
	return count === 4 ? 2 : Math.min(count, 3);
}

export function rewind2026RecordCells(
	records: HighlightRecord[]
): HighlightRecordCell[] {
	const count = records.length;
	const rowSize = wideRowSizeOf(count);
	const lastRowCells = count % rowSize || rowSize;
	const lastRowStart = count - lastRowCells;
	return records.map((record, index) => {
		const cellsInRow = index >= lastRowStart ? lastRowCells : rowSize;
		const fillsNarrowRow = count % 2 === 1 && index === count - 1;
		const narrowSpan = fillsNarrowRow ? "col-span-2" : "col-span-1";
		return {
			record,
			cellClass: `${narrowSpan} ${WIDE_SPAN_BY_CELLS_IN_ROW[cellsInRow]}`,
			revealDelay: (index % rowSize) * REVEAL_STAGGER_MS
		};
	});
}

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

export function platinumRecordOf(
	games: RewindPlatinumGame[] | null,
	language: RewindLanguage
): PlatinumRecord | null {
	if (!games || games.length === 0) return null;
	const text = rewindCopy(language).platinums;
	const sorted = [...games].sort((a, b) =>
		a.platinumedAt.localeCompare(b.platinumedAt)
	);
	const first = sorted[0];
	const last = sorted[sorted.length - 1];
	const summary =
		sorted.length === 1
			? `${first.title} · ${shortDate(first.platinumedAt, language)}`
			: text.dateRange(
					shortDate(first.platinumedAt, language),
					shortDate(last.platinumedAt, language)
				);
	return {
		total: formatRewindNumber(sorted.length, language),
		label: text.inTheYear,
		summary,
		artUrl: gameArtUrl(first, "landscape"),
		covers: sorted.map(game => {
			const date = shortDate(game.platinumedAt, language);
			return {
				code: game.code,
				title: game.title,
				date,
				label: text.gameLabel(game.title, date),
				artUrl: gameArtUrl(game, "portrait")
			};
		})
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
	imports: [
		CoverUrlPipe,
		Rewind2026PlatinumRecord,
		RewindReveal,
		RouterLink,
		UiEyebrow
	],
	templateUrl: "./rewind-2026-highlights.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Rewind2026Highlights {
	readonly highlights = input.required<RewindHighlights>();
	readonly platinumGames = input<RewindPlatinumGame[] | null>(null);
	readonly language = input<RewindLanguage>("en");

	protected readonly recordCells = computed(() =>
		rewind2026RecordCells(recordsOf(this.highlights(), this.language()))
	);
	protected readonly platinum = computed(() =>
		platinumRecordOf(this.platinumGames(), this.language())
	);
	protected readonly stats = computed(() =>
		statsOf(this.highlights(), this.language())
	);
}
