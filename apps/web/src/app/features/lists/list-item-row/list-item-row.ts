import { CdkDragHandle } from "@angular/cdk/drag-drop";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type BacklogStatus, type ListItem } from "../../../core/models";
import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import { RatioSummary } from "../../../shared/components/ratio-summary/ratio-summary";
import { UiIconButton } from "../../../shared/ui";
import {
	backlogStatusIcon,
	backlogStatusIconColor,
	backlogStatusLabel
} from "../../../shared/utils/backlog-status";

export type ListItemRowMode = "own" | "theirs" | "compare";

@Component({
	selector: "app-list-item-row",
	imports: [
		CdkDragHandle,
		RouterLink,
		GamePoster,
		RatioSummary,
		UiIconButton
	],
	templateUrl: "./list-item-row.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListItemRow {
	readonly item = input.required<ListItem>();
	readonly mode = input<ListItemRowMode>("own");
	readonly editable = input(false);
	readonly isFirst = input(false);
	readonly isLast = input(false);
	readonly ownerUsername = input<string | null>(null);
	readonly viewerStatus = input<string | undefined>(undefined);
	readonly canAddToLibrary = input(true);

	readonly libraryRequested = output<void>();
	readonly moveUp = output<void>();
	readonly moveDown = output<void>();
	readonly remove = output<void>();
	readonly moreRequested = output<void>();

	protected readonly runRatio = computed(() => {
		const entry = this.item();
		return entry.backlogStatus === "completed" ? entry.personalRatio : null;
	});
	protected readonly stats = computed(() => {
		const entry = this.item();
		const played =
			entry.backlogStatus === "completed" && entry.realDuration
				? `${entry.realDuration}h`
				: null;
		return [
			{
				label: "Score",
				value: entry.score ?? null,
				valueClass: "text-fg"
			},
			{
				label: "Length",
				value: entry.duration ? `${entry.duration}h` : null,
				valueClass: "text-fg"
			},
			{ label: "Played", value: played, valueClass: "text-success" }
		];
	});

	protected statusIcon(status: string): string {
		return backlogStatusIcon(status as BacklogStatus);
	}

	protected statusColor(status: string): string {
		return backlogStatusIconColor(status as BacklogStatus);
	}

	protected statusLabel(status: string): string {
		return backlogStatusLabel(status as BacklogStatus);
	}
}
