import {
	ChangeDetectionStrategy,
	Component,
	input,
	model,
	output
} from "@angular/core";

import { type Genre, type Platform } from "../../../../core/models";
import { GameFilterPanel } from "../../../../shared/components/game-filter-panel/game-filter-panel";
import { StarRating } from "../../../../shared/components/star-rating/star-rating";
import { UiButton, UiInput, UiSelect } from "../../../../shared/ui";

export interface BrowseSortOption {
	value: string;
	label: string;
	defaultOrder: "asc" | "desc";
}

type GameTypeFilter = boolean | null;

const GAME_TYPE_OPTIONS: { value: GameTypeFilter; label: string }[] = [
	{ value: null, label: "All" },
	{ value: false, label: "Games" },
	{ value: true, label: "DLC" }
];

function toNullableNumber(value: string): number | null {
	return value ? Number(value) : null;
}

@Component({
	selector: "app-browse-filters",
	imports: [GameFilterPanel, StarRating, UiButton, UiInput, UiSelect],
	templateUrl: "./browse-filters.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrowseFilters {
	readonly allGenres = input.required<Genre[]>();
	readonly allPlatforms = input.required<Platform[]>();
	readonly sortOptions = input.required<BrowseSortOption[]>();
	readonly sortBy = input.required<string>();
	readonly activeCount = input(0);

	readonly selectedGenres = model.required<Set<string>>();
	readonly selectedPlatforms = model.required<Set<string>>();
	readonly yearFrom = model.required<number | null>();
	readonly yearTo = model.required<number | null>();
	readonly minScore = model.required<number | null>();
	readonly maxScore = model.required<number | null>();
	readonly minDuration = model.required<number | null>();
	readonly maxDuration = model.required<number | null>();
	readonly isDlc = model.required<GameTypeFilter>();

	readonly sortChange = output<string>();
	readonly cleared = output<void>();

	protected readonly typeOptions = GAME_TYPE_OPTIONS;

	protected setMinDuration(value: string): void {
		this.minDuration.set(toNullableNumber(value));
	}

	protected setMaxDuration(value: string): void {
		this.maxDuration.set(toNullableNumber(value));
	}
}
