import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import { RouterLink } from "@angular/router";

import {
	type RewindLanguage,
	type RewindPlatinumGame
} from "../../../../../core/models/rewind.model";
import { CoverUrlPipe } from "../../../../../shared/pipes/cover-url";
import { UiEyebrow } from "../../../../../shared/ui";
import { gameArtUrl } from "../../../../../shared/utils/game-art";
import {
	formatRewindNumber,
	rewindCopy,
	shortDate,
	spokenMonthList,
	spokenMonthRange,
	utcMonth
} from "../../../rewind-copy";
import { RewindReveal } from "../../../rewind-reveal";
import {
	type PlatinumCell,
	type PlatinumGridLayout
} from "./rewind-2026-platinums.model";

const REVEAL_STAGGER_MS = 60;
const PHONE_COLUMNS = 2;
const MAX_DESKTOP_COLUMNS = 4;
const MAX_LISTED_MONTHS = 3;

const DESKTOP_GRID_CLASS: Record<number, string> = {
	1: "lg:grid-cols-1",
	2: "lg:grid-cols-2",
	3: "lg:grid-cols-3",
	4: "lg:grid-cols-4"
};

const DESKTOP_LEAD_SPAN_CLASS: Record<number, string> = {
	1: "lg:col-span-1",
	2: "lg:col-span-2",
	3: "lg:col-span-3",
	4: "lg:col-span-4"
};

function emptySlots(cells: number, columns: number): number {
	return (columns - (cells % columns)) % columns;
}

export function platinumGridLayout(platinums: number): PlatinumGridLayout {
	const cells = platinums + 1;
	const columns = Math.min(cells, MAX_DESKTOP_COLUMNS);
	const leadSpan = 1 + emptySlots(cells, columns);
	const phoneLeadClass =
		emptySlots(cells, PHONE_COLUMNS) > 0 ? "col-span-2" : "col-span-1";
	return {
		columns,
		gridClass: DESKTOP_GRID_CLASS[columns],
		leadClass: `${phoneLeadClass} ${DESKTOP_LEAD_SPAN_CLASS[leadSpan]}`
	};
}

export function platinumMonthsLine(
	games: RewindPlatinumGame[],
	language: RewindLanguage
): string {
	const months = [...new Set(games.map(game => utcMonth(game.platinumedAt)))]
		.filter(month => Number.isInteger(month))
		.sort((a, b) => a - b);
	if (months.length === 0) return "";
	if (months.length > MAX_LISTED_MONTHS)
		return spokenMonthRange(months[0], months[months.length - 1], language);
	return spokenMonthList(months, language);
}

function cellsOf(
	games: RewindPlatinumGame[],
	language: RewindLanguage
): PlatinumCell[] {
	const text = rewindCopy(language).platinums;
	return games.map(game => {
		const date = shortDate(game.platinumedAt, language);
		return {
			gameId: game.gameId,
			code: game.code,
			title: game.title,
			date,
			label: text.gameLabel(game.title, date),
			artUrl: gameArtUrl(game, "landscape")
		};
	});
}

@Component({
	selector: "app-rewind-2026-platinums",
	imports: [CoverUrlPipe, RewindReveal, RouterLink, UiEyebrow],
	templateUrl: "./rewind-2026-platinums.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Rewind2026Platinums {
	readonly games = input.required<RewindPlatinumGame[]>();
	readonly language = input<RewindLanguage>("en");

	protected readonly text = computed(
		() => rewindCopy(this.language()).platinums
	);
	protected readonly cells = computed(() =>
		cellsOf(this.games(), this.language())
	);
	protected readonly total = computed(() =>
		formatRewindNumber(this.games().length, this.language())
	);
	protected readonly months = computed(() =>
		platinumMonthsLine(this.games(), this.language())
	);
	protected readonly layout = computed(() =>
		platinumGridLayout(this.games().length)
	);

	protected revealDelay(index: number): number {
		return (index % this.layout().columns) * REVEAL_STAGGER_MS;
	}
}
