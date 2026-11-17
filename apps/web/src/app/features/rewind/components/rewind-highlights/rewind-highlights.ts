import { NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import { RouterLink } from "@angular/router";

import {
	type RewindFinishedGame,
	type RewindHighlights as RewindHighlightsData,
	type RewindLanguage
} from "../../../../core/models/rewind.model";
import { GamePoster } from "../../../../shared/components/game-poster/game-poster";
import { CoverUrlPipe } from "../../../../shared/pipes/cover-url";
import {
	formatHours,
	formatRewindNumber,
	monthName,
	monthRange,
	rewindCopy,
	shortDate,
	spokenMonthRange
} from "../../rewind-copy";
import { RewindReveal } from "../../rewind-reveal";
import {
	type RewindTone,
	TONE_ACCENT_CAPSULE_CLASS,
	TONE_ACCENT_CARD_CLASS,
	TONE_ACCENT_TEXT_CLASS,
	toneVar
} from "../../rewind-tone";
import {
	type CellView,
	type HighlightCell,
	type HighlightKey
} from "./rewind-highlights.model";

export const NARROW_COLUMNS = 2;
export const WIDE_COLUMNS = 4;
export const HIGHLIGHT_ORDER: HighlightKey[] = [
	"bestRatio",
	"firstFinished",
	"lastFinished",
	"longest",
	"fastest",
	"longestStreak",
	"busiestMonth",
	"topGenres",
	"topPlatforms",
	"classic"
];

export const HIGHLIGHT_TONE: Record<HighlightKey, RewindTone> = {
	bestRatio: "lists",
	firstFinished: "tags",
	lastFinished: "tags",
	longest: "sagas",
	fastest: "playing",
	longestStreak: "shelf",
	busiestMonth: "success",
	topGenres: "queue",
	topPlatforms: "platinum",
	classic: "sagas"
};

const HIGHLIGHT_ICON: Record<HighlightKey, string> = {
	bestRatio: "bolt",
	firstFinished: "flag",
	lastFinished: "sports_score",
	longest: "hourglass_full",
	fastest: "timer",
	longestStreak: "local_fire_department",
	busiestMonth: "calendar_month",
	topGenres: "category",
	topPlatforms: "sports_esports",
	classic: "history"
};

const ARTWORK_CLASS =
	"absolute inset-0 -z-20 size-full object-cover opacity-55 saturate-80 transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.06]";
const RISING_VEIL_CLASS =
	"absolute inset-0 -z-10 bg-[linear-gradient(to_top,var(--color-surface)_48%,color-mix(in_oklab,var(--color-surface)_55%,transparent)_82%,transparent)]";
const FLAT_VEIL_CLASS =
	"absolute inset-0 -z-10 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-surface)_90%,transparent),color-mix(in_oklab,var(--color-surface)_72%,transparent))]";

const REVEAL_STAGGER_MS = 60;
const WIDE_LARGE = new Set<HighlightKey>(["bestRatio"]);
const NARROW_FULL = new Set<HighlightKey>([
	"bestRatio",
	"firstFinished",
	"lastFinished",
	"topGenres",
	"topPlatforms",
	"classic"
]);
const WIDE_STRETCH_FIRST = new Set<HighlightKey>(["topGenres", "topPlatforms"]);

const NARROW_SPAN_CLASS: Record<number, string> = {
	1: "col-span-1",
	2: "col-span-2"
};

const WIDE_SPAN_CLASS: Record<number, string> = {
	1: "lg:col-span-1",
	2: "lg:col-span-2",
	3: "lg:col-span-3",
	4: "lg:col-span-4"
};

function isSameGame(
	first: RewindFinishedGame | null,
	last: RewindFinishedGame | null
): boolean {
	return !!first && !!last && first.gameId === last.gameId;
}

export function presentHighlightKeys(
	highlights: RewindHighlightsData
): HighlightKey[] {
	const present: Record<HighlightKey, boolean> = {
		bestRatio: highlights.bestRatio !== null,
		firstFinished: highlights.firstFinished !== null,
		lastFinished:
			highlights.lastFinished !== null &&
			!isSameGame(highlights.firstFinished, highlights.lastFinished),
		longest: highlights.longest !== null,
		fastest: highlights.fastest !== null,
		longestStreak: highlights.longestStreak !== null,
		busiestMonth: highlights.busiestMonth !== null,
		topGenres: highlights.topGenres.length > 0,
		topPlatforms: highlights.topPlatforms.length > 0,
		classic: highlights.classic !== null
	};
	return HIGHLIGHT_ORDER.filter(key => present[key]);
}

function baseCell(key: HighlightKey): HighlightCell {
	return {
		key,
		columns: NARROW_FULL.has(key) ? 2 : 1,
		wideColumns: WIDE_LARGE.has(key) ? 2 : 1
	};
}

function missingCells(used: number, columns: number): number {
	const remainder = used % columns;
	return remainder === 0 ? 0 : columns - remainder;
}

function lastMatching(
	cells: HighlightCell[],
	predicate: (cell: HighlightCell) => boolean
): HighlightCell | undefined {
	return [...cells].reverse().find(predicate);
}

function wideFillerFor(
	cells: HighlightCell[],
	wideGap: number
): HighlightCell | undefined {
	const fitsGap = (cell: HighlightCell) =>
		cell.wideColumns + wideGap <= WIDE_COLUMNS;
	return (
		lastMatching(
			cells,
			cell => WIDE_STRETCH_FIRST.has(cell.key) && fitsGap(cell)
		) ?? lastMatching(cells, fitsGap)
	);
}

function packIntoFullRows(cells: HighlightCell[]): HighlightCell[] {
	if (cells.length === 0) return cells;
	const narrowArea = cells.reduce((sum, cell) => sum + cell.columns, 0);
	const wideArea = cells.reduce((sum, cell) => sum + cell.wideColumns, 0);
	const narrowGap = missingCells(narrowArea, NARROW_COLUMNS);
	const wideGap = missingCells(wideArea, WIDE_COLUMNS);
	const narrowFiller = lastMatching(
		cells,
		cell => cell.columns + narrowGap <= NARROW_COLUMNS
	);
	const wideFiller = wideFillerFor(cells, wideGap);
	if (narrowFiller) narrowFiller.columns += narrowGap;
	if (wideFiller) wideFiller.wideColumns += wideGap;
	return cells;
}

export function highlightLayoutOf(keys: HighlightKey[]): HighlightCell[] {
	return packIntoFullRows(keys.map(baseCell));
}

export function highlightLayout(
	highlights: RewindHighlightsData
): HighlightCell[] {
	return highlightLayoutOf(presentHighlightKeys(highlights));
}

function cellClass(cell: HighlightCell): string {
	return `${NARROW_SPAN_CLASS[cell.columns]} ${WIDE_SPAN_CLASS[cell.wideColumns]}`;
}

@Component({
	selector: "app-rewind-highlights",
	imports: [
		CoverUrlPipe,
		NgTemplateOutlet,
		RouterLink,
		GamePoster,
		RewindReveal
	],
	templateUrl: "./rewind-highlights.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindHighlights {
	readonly highlights = input.required<RewindHighlightsData>();
	readonly language = input<RewindLanguage>("en");

	protected readonly copy = computed(
		() => rewindCopy(this.language()).highlights
	);
	protected readonly cardClass = TONE_ACCENT_CARD_CLASS;
	protected readonly accentClass = TONE_ACCENT_TEXT_CLASS;
	protected readonly capsuleClass = TONE_ACCENT_CAPSULE_CLASS;
	protected readonly artworkClass = ARTWORK_CLASS;
	protected readonly risingVeilClass = RISING_VEIL_CLASS;
	protected readonly flatVeilClass = FLAT_VEIL_CLASS;
	protected readonly icons = HIGHLIGHT_ICON;

	protected readonly cells = computed(() => {
		const views: Partial<Record<HighlightKey, CellView>> = {};
		highlightLayout(this.highlights()).forEach((cell, index) => {
			views[cell.key] = {
				classes: cellClass(cell),
				tone: toneVar(HIGHLIGHT_TONE[cell.key]),
				delayMs: (index % WIDE_COLUMNS) * REVEAL_STAGGER_MS
			};
		});
		return views;
	});

	protected readonly busiestMonthName = computed(() => {
		const month = this.highlights().busiestMonth;
		return month ? monthName(month.month, this.language()) : "";
	});
	protected readonly busiestMonthCount = computed(() => {
		const month = this.highlights().busiestMonth;
		return month ? this.copy().gamesFinished(month.count) : "";
	});
	protected readonly streakRange = computed(() => {
		const streak = this.highlights().longestStreak;
		return streak
			? monthRange(streak.fromMonth, streak.toMonth, this.language())
			: "";
	});
	protected readonly spokenStreakRange = computed(() => {
		const streak = this.highlights().longestStreak;
		return streak
			? spokenMonthRange(
					streak.fromMonth,
					streak.toMonth,
					this.language()
				)
			: "";
	});

	protected artOf(game: {
		backgroundUrl: string | null;
		coverUrl: string | null;
	}): string | null {
		return game.backgroundUrl ?? game.coverUrl;
	}

	protected hours(value: number): string {
		return formatHours(value, this.language());
	}

	protected number(value: number): string {
		return formatRewindNumber(value, this.language());
	}

	protected dateOf(isoDate: string): string {
		return shortDate(isoDate, this.language());
	}

	protected gamesCount(count: number): string {
		return this.copy().games(count);
	}

	protected runsCount(count: number): string {
		return this.copy().runs(count);
	}
}
