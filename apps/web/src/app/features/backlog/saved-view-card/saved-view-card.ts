import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type BacklogStatus } from "../../../core/models";
import { ActionMenu } from "../../../shared/components/action-menu/action-menu";
import { type ActionMenuItem } from "../../../shared/components/action-menu/action-menu.model";
import { BacklogStatusBadge } from "../../../shared/components/backlog-status-badge/backlog-status-badge";
import { UiBadge, UiIconButton } from "../../../shared/ui";
import {
	backlogStatusIcon,
	backlogStatusLabel
} from "../../../shared/utils/backlog-status";
import { savedFilterColorHex } from "../saved-filter-appearance";
import { type SavedFilter } from "../saved-filters.model";
import { type ViewChip } from "./saved-view-card.model";

type ViewActionId = "share" | "duplicate" | "edit";

const MENU_ITEMS: readonly ActionMenuItem[] = [
	{ id: "share", icon: "share", label: "Copy public link" },
	{ id: "duplicate", icon: "content_copy", label: "Duplicate" },
	{ id: "edit", icon: "edit", label: "Edit" }
];

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
			tone: "neutral",
			status: status as BacklogStatus
		});
	}
	if (filters["platform_id"] || filters["platforms"]) {
		chips.push({
			label: "Platform",
			icon: "devices",
			tone: "brand"
		});
	}
	if (filters["genres"]) {
		chips.push({
			label: "Genres",
			icon: "category",
			tone: "neutral"
		});
	}
	if (filters["started_from"] || filters["started_to"]) {
		chips.push({
			label: "Started",
			icon: "play_arrow",
			tone: "neutral"
		});
	}
	if (filters["finished_from"] || filters["finished_to"]) {
		chips.push({ label: "Finished", icon: "flag", tone: "neutral" });
	}
	if (filters["min_rating"] || filters["max_rating"]) {
		chips.push({
			label: "Rating",
			icon: "star",
			tone: "rating"
		});
	}
	if (view.sortBy && view.sortBy !== "createdAt") {
		const arrow = view.sortOrder === "asc" ? "↑" : "↓";
		chips.push({
			label: `${SORT_LABELS[view.sortBy] ?? view.sortBy} ${arrow}`,
			icon: "sort",
			tone: "neutral"
		});
	}
	return chips;
}

@Component({
	selector: "app-saved-view-card",
	imports: [
		ActionMenu,
		BacklogStatusBadge,
		RouterLink,
		UiBadge,
		UiIconButton
	],
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

	protected readonly accent = computed(
		() => savedFilterColorHex(this.view().color) ?? "var(--color-brand)"
	);
	protected readonly menuItems = MENU_ITEMS;
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

	protected trigger(id: ViewActionId | string) {
		if (id === "share") this.shared.emit();
		else if (id === "duplicate") this.duplicated.emit();
		else if (id === "edit") this.edited.emit();
	}
}
