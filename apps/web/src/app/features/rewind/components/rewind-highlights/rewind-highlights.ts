import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import { RouterLink } from "@angular/router";

import {
	type RewindHighlights as RewindHighlightsData,
	type RewindTotals
} from "../../../../core/models/rewind.model";
import { GamePoster } from "../../../../shared/components/game-poster/game-poster";
import { StarRating } from "../../../../shared/components/star-rating/star-rating";
import { formatHours, monthName, pluralize } from "../../rewind-copy";

export type HighlightKey = keyof RewindHighlightsData;

export interface HighlightCell {
	key: HighlightKey;
	columns: number;
	wideColumns: number;
	wideRows: number;
}

export const NARROW_COLUMNS = 2;
export const WIDE_COLUMNS = 4;

const HIGHLIGHT_ORDER: HighlightKey[] = [
	"topRated",
	"bestRatio",
	"longest",
	"fastest",
	"favoriteGenre",
	"topPlatform",
	"busiestMonth"
];

const LARGE_HIGHLIGHTS = new Set<HighlightKey>(["topRated", "bestRatio"]);
const TOP_RATED_TALL_MIN_NEIGHBOURS = 3;

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

function baseCell(key: HighlightKey): HighlightCell {
	const columns = LARGE_HIGHLIGHTS.has(key) ? 2 : 1;
	return { key, columns, wideColumns: columns, wideRows: 1 };
}

function cellArea(cell: HighlightCell): number {
	return cell.wideColumns * cell.wideRows;
}

function missingCells(used: number, columns: number): number {
	const remainder = used % columns;
	return remainder === 0 ? 0 : columns - remainder;
}

export function highlightLayout(
	highlights: RewindHighlightsData
): HighlightCell[] {
	const cells = HIGHLIGHT_ORDER.filter(key => highlights[key] !== null).map(
		baseCell
	);
	if (cells.length === 0) return cells;
	const [first] = cells;
	const neighbours = cells.filter(cell => cell !== first);
	const neighbourArea = neighbours.reduce(
		(sum, cell) => sum + cellArea(cell),
		0
	);
	if (
		first.key === "topRated" &&
		neighbourArea >= TOP_RATED_TALL_MIN_NEIGHBOURS
	) {
		first.wideRows = 2;
	}
	const last = cells.at(-1)!;
	const narrowArea = cells.reduce((sum, cell) => sum + cell.columns, 0);
	const wideArea = cells.reduce((sum, cell) => sum + cellArea(cell), 0);
	last.columns += missingCells(narrowArea, NARROW_COLUMNS);
	last.wideColumns += missingCells(wideArea, WIDE_COLUMNS);
	return cells;
}

function cellClass(cell: HighlightCell): string {
	return [
		NARROW_SPAN_CLASS[cell.columns],
		WIDE_SPAN_CLASS[cell.wideColumns],
		cell.wideRows === 2 ? "lg:row-span-2" : ""
	]
		.filter(Boolean)
		.join(" ");
}

@Component({
	selector: "app-rewind-highlights",
	imports: [RouterLink, GamePoster, StarRating],
	templateUrl: "./rewind-highlights.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindHighlights {
	readonly highlights = input.required<RewindHighlightsData>();
	readonly totals = input.required<RewindTotals>();

	protected readonly formatHours = formatHours;
	protected readonly cellClasses = computed(() => {
		const classes: Partial<Record<HighlightKey, string>> = {};
		for (const cell of highlightLayout(this.highlights())) {
			classes[cell.key] = cellClass(cell);
		}
		return classes;
	});
	protected readonly genreShare = computed(() => {
		const genre = this.highlights().favoriteGenre;
		return genre
			? `${genre.count} of ${pluralize(this.totals().finished, "game", "games")}`
			: "";
	});
	protected readonly platformRuns = computed(() => {
		const platform = this.highlights().topPlatform;
		return platform ? pluralize(platform.count, "run", "runs") : "";
	});
	protected readonly busiestMonthName = computed(() => {
		const month = this.highlights().busiestMonth;
		return month ? monthName(month.month) : "";
	});
	protected readonly busiestMonthCount = computed(() => {
		const month = this.highlights().busiestMonth;
		return month
			? `${pluralize(month.count, "game", "games")} finished`
			: "";
	});
}
