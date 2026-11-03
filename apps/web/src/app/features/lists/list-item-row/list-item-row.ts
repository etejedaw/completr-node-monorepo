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
import { ActionMenu } from "../../../shared/components/action-menu/action-menu";
import { type ActionMenuItem } from "../../../shared/components/action-menu/action-menu.model";
import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import { RatioSummary } from "../../../shared/components/ratio-summary/ratio-summary";
import { UiButton, UiEyebrow, UiIconButton } from "../../../shared/ui";
import {
	backlogStatusIcon,
	backlogStatusIconColor,
	backlogStatusLabel
} from "../../../shared/utils/backlog-status";

export type ListItemRowMode = "own" | "theirs" | "compare";

@Component({
	selector: "app-list-item-row",
	imports: [
		ActionMenu,
		CdkDragHandle,
		RouterLink,
		GamePoster,
		RatioSummary,
		UiButton,
		UiEyebrow,
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

	protected readonly mobileActions = computed<readonly ActionMenuItem[]>(
		() => [
			{
				id: "up",
				label: "Move up",
				icon: "arrow_upward",
				disabled: this.isFirst()
			},
			{
				id: "down",
				label: "Move down",
				icon: "arrow_downward",
				disabled: this.isLast()
			},
			{
				id: "remove",
				label: "Remove from list",
				icon: "playlist_remove",
				iconClass: "text-danger"
			}
		]
	);
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

	protected runMobileAction(id: string) {
		if (id === "up") this.moveUp.emit();
		else if (id === "down") this.moveDown.emit();
		else this.remove.emit();
	}

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
