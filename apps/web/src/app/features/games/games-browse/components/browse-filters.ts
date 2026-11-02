import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	model,
	output
} from "@angular/core";

import { type Genre, type Platform } from "../../../../core/models";
import { FilterSection } from "../../../../shared/components/filter-section/filter-section";
import { GameFilterPanel } from "../../../../shared/components/game-filter-panel/game-filter-panel";
import { RangeInputs } from "../../../../shared/components/range-inputs/range-inputs";
import { SegmentedControl } from "../../../../shared/components/segmented-control/segmented-control";
import { type SegmentedOption } from "../../../../shared/components/segmented-control/segmented-control.model";
import { StarRating } from "../../../../shared/components/star-rating/star-rating";
import { UiButton } from "../../../../shared/ui";

type GameTypeFilter = boolean | null;
type GameTypeValue = "all" | "games" | "dlc";

const GAME_TYPE_OPTIONS: SegmentedOption<GameTypeValue>[] = [
	{ value: "all", label: "All" },
	{ value: "games", label: "Games" },
	{ value: "dlc", label: "DLC" }
];

const GAME_TYPE_FILTER: Record<GameTypeValue, GameTypeFilter> = {
	all: null,
	games: false,
	dlc: true
};

@Component({
	selector: "app-browse-filters",
	imports: [
		FilterSection,
		GameFilterPanel,
		RangeInputs,
		SegmentedControl,
		StarRating,
		UiButton
	],
	templateUrl: "./browse-filters.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrowseFilters {
	readonly allGenres = input.required<Genre[]>();
	readonly allPlatforms = input.required<Platform[]>();
	readonly activeCount = input(0);
	readonly showClear = input(true);

	readonly selectedGenres = model.required<Set<string>>();
	readonly selectedPlatforms = model.required<Set<string>>();
	readonly yearFrom = model.required<number | null>();
	readonly yearTo = model.required<number | null>();
	readonly minScore = model.required<number | null>();
	readonly maxScore = model.required<number | null>();
	readonly minDuration = model.required<number | null>();
	readonly maxDuration = model.required<number | null>();
	readonly isDlc = model.required<GameTypeFilter>();

	readonly cleared = output<void>();

	protected readonly typeOptions = GAME_TYPE_OPTIONS;
	protected readonly typeValue = computed<GameTypeValue>(() => {
		const isDlc = this.isDlc();
		if (isDlc === null) return "all";
		return isDlc ? "dlc" : "games";
	});

	protected setType(value: GameTypeValue): void {
		this.isDlc.set(GAME_TYPE_FILTER[value]);
	}
}
