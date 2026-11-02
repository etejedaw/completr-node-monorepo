import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type BacklogStatus } from "../../../core/models";
import { UiIconButton } from "../../../shared/ui";
import {
	backlogStatusClass,
	backlogStatusIcon,
	backlogStatusLabel
} from "../../../shared/utils/backlog-status";
import { savedFilterColorHex } from "../saved-filter-appearance";
import { type SavedFilter } from "../saved-filters.model";
import { type ViewChip } from "./saved-view-card.model";

type ViewActionId = "share" | "duplicate" | "edit";

const NEUTRAL_CHIP = "bg-input-bg text-fg-secondary border border-line";

const SORT_LABELS: Record<string, string> = {
	title: "Title",
	score: "Score",
	duration: "Length",
	ratio: "Ratio",
	status: "Status",
	realDuration: "Playtime",
	userRating: "Your rating",
	personalRatio: "Your ratio",
	finishedAt: "Finished date",
	startedAt: "Started date",
	createdAt: "Date added"
};

function buildChips(view: SavedFilter): ViewChip[] {
	const filters = view.filters as Record<string, string>;
	const chips: ViewChip[] = [];
	for (const status of filters["status"]?.split(",") ?? []) {
		chips.push({
			label: backlogStatusLabel(status as BacklogStatus),
			icon: backlogStatusIcon(status as BacklogStatus),
			classes: backlogStatusClass(status as BacklogStatus)
		});
	}
	if (filters["platform_id"] || filters["platforms"]) {
		chips.push({
			label: "Platform",
			icon: "devices",
			classes: "bg-brand-subtle text-brand"
		});
	}
	if (filters["genres"]) {
		chips.push({
			label: "Genres",
			icon: "category",
			classes: NEUTRAL_CHIP
		});
	}
	if (filters["started_from"] || filters["started_to"]) {
		chips.push({
			label: "Started",
			icon: "play_arrow",
			classes: NEUTRAL_CHIP
		});
	}
	if (filters["finished_from"] || filters["finished_to"]) {
		chips.push({ label: "Finished", icon: "flag", classes: NEUTRAL_CHIP });
	}
	if (filters["min_rating"] || filters["max_rating"]) {
		chips.push({
			label: "Rating",
			icon: "star",
			classes: "bg-rating/10 text-rating"
		});
	}
	if (view.sortBy && view.sortBy !== "createdAt") {
		const arrow = view.sortOrder === "asc" ? "↑" : "↓";
		chips.push({
			label: `${SORT_LABELS[view.sortBy] ?? view.sortBy} ${arrow}`,
			icon: "sort",
			classes: NEUTRAL_CHIP
		});
	}
	return chips;
}

@Component({
	selector: "app-saved-view-card",
	imports: [RouterLink, UiIconButton],
	templateUrl: "./saved-view-card.html",
	host: { class: "block h-full" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SavedViewCard {
	readonly view = input.required<SavedFilter>();
	readonly variant = input<"card" | "row">("card");

	readonly shared = output<void>();
	readonly duplicated = output<void>();
	readonly edited = output<void>();
	readonly moreRequested = output<void>();

	protected readonly accent = computed(
		() => savedFilterColorHex(this.view().color) ?? "var(--color-brand)"
	);
	protected readonly chips = computed(() => buildChips(this.view()));
	protected readonly actions = computed(() => {
		const name = this.view().name;
		return [
			{
				id: "share" as ViewActionId,
				icon: "share",
				label: `Copy public link to ${name}`
			},
			{
				id: "duplicate" as ViewActionId,
				icon: "content_copy",
				label: `Duplicate ${name}`
			},
			{ id: "edit" as ViewActionId, icon: "edit", label: `Edit ${name}` }
		];
	});

	protected trigger(id: ViewActionId) {
		if (id === "share") this.shared.emit();
		else if (id === "duplicate") this.duplicated.emit();
		else this.edited.emit();
	}
}
