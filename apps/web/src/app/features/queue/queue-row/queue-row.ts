import { CdkDragHandle } from "@angular/cdk/drag-drop";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type QueueEntry } from "../../../core/models";
import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import { UiBottomSheet } from "../../../shared/ui";

type RowActionId = "favorite" | "top" | "up" | "down" | "remove";

interface RowAction {
	id: RowActionId;
	icon: string;
	label: string;
	iconClass: string;
	disabled: boolean;
}

@Component({
	selector: "app-queue-row",
	imports: [CdkDragHandle, RouterLink, GamePoster, UiBottomSheet],
	templateUrl: "./queue-row.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class QueueRow {
	readonly entry = input.required<QueueEntry>();
	readonly position = input.required<number>();
	readonly reorderable = input(false);
	readonly readonly = input(false);
	readonly isFirst = input(false);
	readonly isLast = input(false);
	readonly isFavorite = input(false);
	readonly statusUpdating = input(false);
	readonly movingToTop = input(false);

	readonly startPlaying = output<void>();
	readonly favoriteToggle = output<void>();
	readonly remove = output<void>();
	readonly moveToTop = output<void>();
	readonly moveUp = output<void>();
	readonly moveDown = output<void>();

	protected readonly sheetOpen = signal(false);

	protected readonly isTop = computed(() => this.entry().position <= 1);

	protected readonly sheetActions = computed<RowAction[]>(() => {
		const favorite = this.isFavorite();
		const actions: RowAction[] = [
			{
				id: "favorite",
				icon: favorite ? "favorite" : "favorite_border",
				label: favorite ? "Remove from favorites" : "Add to favorites",
				iconClass: "text-nav-favorites",
				disabled: false
			}
		];
		if (this.reorderable())
			actions.push(
				{
					id: "top",
					icon: "vertical_align_top",
					label: "Move to top",
					iconClass: "text-fg-muted",
					disabled: this.isTop() || this.movingToTop()
				},
				{
					id: "up",
					icon: "arrow_upward",
					label: "Move up",
					iconClass: "text-fg-muted",
					disabled: this.isFirst()
				},
				{
					id: "down",
					icon: "arrow_downward",
					label: "Move down",
					iconClass: "text-fg-muted",
					disabled: this.isLast()
				}
			);
		actions.push({
			id: "remove",
			icon: "playlist_remove",
			label: "Remove from Up Next",
			iconClass: "text-danger",
			disabled: false
		});
		return actions;
	});

	protected runSheetAction(id: RowActionId) {
		this.sheetOpen.set(false);
		if (id === "favorite") this.favoriteToggle.emit();
		else if (id === "top") this.moveToTop.emit();
		else if (id === "up") this.moveUp.emit();
		else if (id === "down") this.moveDown.emit();
		else this.remove.emit();
	}
}
