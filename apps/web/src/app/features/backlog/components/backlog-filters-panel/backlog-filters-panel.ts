import { NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	model,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type Genre, type Platform } from "../../../../core/models";
import { ViewportService } from "../../../../core/services/viewport";
import {
	ChipGroup,
	type ChipOption
} from "../../../../shared/components/chip-group/chip-group";
import { FilterSection } from "../../../../shared/components/filter-section/filter-section";
import { GameFilterPanel } from "../../../../shared/components/game-filter-panel/game-filter-panel";
import { MoodTagsInput } from "../../../../shared/components/mood-tags-input/mood-tags-input";
import {
	OptionPicker,
	type PickerOption
} from "../../../../shared/components/option-picker/option-picker";
import { RangeInputs } from "../../../../shared/components/range-inputs/range-inputs";
import { StarRating } from "../../../../shared/components/star-rating/star-rating";
import {
	UiBottomSheet,
	UiButton,
	UiDrawer,
	UiInput,
	UiSwitch
} from "../../../../shared/ui";
import { BACKLOG_STATUS_FILTERS } from "../../../../shared/utils/backlog-status";

export type SortOrder = "asc" | "desc";

const BACKLOG_SORT_OPTIONS: readonly PickerOption[] = [
	{ value: "createdAt", label: "Date added", icon: "schedule" },
	{ value: "title", label: "Title", icon: "sort_by_alpha" },
	{ value: "score", label: "Score", icon: "star" },
	{ value: "duration", label: "Duration", icon: "timer" },
	{ value: "ratio", label: "Ratio", icon: "trending_up" },
	{ value: "realDuration", label: "Real duration", icon: "hourglass_bottom" },
	{ value: "personalRatio", label: "Personal ratio", icon: "insights" },
	{ value: "userRating", label: "Rating", icon: "grade" },
	{ value: "finishedAt", label: "Finished", icon: "event_available" },
	{ value: "status", label: "Status", icon: "flag" }
];

const SORT_ORDER_OPTIONS: readonly PickerOption[] = [
	{ value: "desc", label: "Descending", icon: "arrow_downward" },
	{ value: "asc", label: "Ascending", icon: "arrow_upward" }
];

@Component({
	selector: "app-backlog-filters-panel",
	imports: [
		NgTemplateOutlet,
		RouterLink,
		ChipGroup,
		FilterSection,
		GameFilterPanel,
		MoodTagsInput,
		OptionPicker,
		RangeInputs,
		StarRating,
		UiBottomSheet,
		UiButton,
		UiDrawer,
		UiInput,
		UiSwitch
	],
	templateUrl: "./backlog-filters-panel.html",
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogFiltersPanel {
	protected readonly isMobile = inject(ViewportService).isMobile;
	protected readonly statusChipOptions: readonly ChipOption[] =
		BACKLOG_STATUS_FILTERS;
	protected readonly sortPickerOptions = BACKLOG_SORT_OPTIONS;
	protected readonly sortOrderPickerOptions = SORT_ORDER_OPTIONS;

	readonly allPlatforms = input<Platform[]>([]);
	readonly allGenres = input<Genre[]>([]);
	readonly moodTagsSuggestions = input<string[]>([]);
	readonly activeFiltersCount = input(0);
	readonly advancedFiltersActive = input(false);
	readonly hasActiveView = input(false);
	readonly creatingView = input(false);
	readonly saving = input(false);
	readonly previewTotal = input<number | null>(null);

	readonly statuses = model<readonly string[]>([]);
	readonly selectedPlatform = model("");
	readonly selectedPlatforms = model<Set<string>>(new Set());
	readonly selectedGenres = model<Set<string>>(new Set());
	readonly yearFrom = model<number | null>(null);
	readonly yearTo = model<number | null>(null);
	readonly startedFrom = model("");
	readonly startedTo = model("");
	readonly finishedFrom = model("");
	readonly finishedTo = model("");
	readonly minRating = model<number | null>(null);
	readonly maxRating = model<number | null>(null);
	readonly minRealDuration = model<number | null>(null);
	readonly maxRealDuration = model<number | null>(null);
	readonly minRatio = model<number | null>(null);
	readonly maxRatio = model<number | null>(null);
	readonly minPersonalRatio = model<number | null>(null);
	readonly maxPersonalRatio = model<number | null>(null);
	readonly selectedMoodTags = model<string[]>([]);
	readonly coopOnly = model(false);
	readonly sortBy = model("createdAt");
	readonly sortOrder = model<SortOrder>("desc");
	readonly showAdvancedFilters = model(false);
	readonly newFilterName = model("");
	readonly newFilterPinned = model(true);

	readonly updateViewRequested = output<void>();
	readonly saveViewRequested = output<void>();
	readonly cleared = output<void>();
	readonly applied = output<void>();
	readonly closed = output<void>();

	protected readonly hasActiveFilters = computed(
		() => this.activeFiltersCount() > 0
	);

	protected readonly platformPickerOptions = computed<PickerOption[]>(() => [
		{ value: "", label: "All platforms", icon: "devices" },
		...this.allPlatforms().map(platform => ({
			value: platform.id,
			label: platform.name
		}))
	]);

	protected readonly heading = computed(() =>
		this.creatingView() ? "New view" : "Filters"
	);

	protected readonly subheading = computed(() => {
		const count = this.activeFiltersCount();
		if (count > 0)
			return `${count} ${count === 1 ? "filter" : "filters"} active`;
		if (this.creatingView())
			return "Choose filters, then name and save your view";
		return "Narrow your library by status, platform, dates and more";
	});

	protected readonly applyLabel = computed(() => {
		const total = this.previewTotal();
		const saving = this.newFilterName().trim().length > 0;
		if (total === null)
			return saving ? "Save & show results" : "Show results";
		const noun = total === 1 ? "result" : "results";
		return saving
			? `Save & show ${total} ${noun}`
			: `Show ${total} ${noun}`;
	});

	protected toggleAdvancedFilters() {
		this.showAdvancedFilters.update(visible => !visible);
	}

	protected setSortOrder(value: string) {
		if (value === "asc" || value === "desc") this.sortOrder.set(value);
	}
}
