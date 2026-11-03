import { CdkDragHandle } from "@angular/cdk/drag-drop";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type QueueEntry } from "../../../core/models";
import { ActionMenu } from "../../../shared/components/action-menu/action-menu";
import { type ActionMenuItem } from "../../../shared/components/action-menu/action-menu.model";
import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import { UiIconButton } from "../../../shared/ui";

@Component({
	selector: "app-queue-row",
	imports: [ActionMenu, CdkDragHandle, RouterLink, GamePoster, UiIconButton],
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

	protected readonly isTop = computed(() => this.entry().position <= 1);

	protected readonly menuActions = computed<ActionMenuItem[]>(() => {
		const favorite = this.isFavorite();
		const actions: ActionMenuItem[] = [
			{
				id: "favorite",
				icon: favorite ? "favorite" : "favorite_border",
				label: favorite ? "Remove from favorites" : "Add to favorites",
				iconClass: "text-nav-favorites"
			}
		];
		if (this.reorderable())
			actions.push(
				{
					id: "top",
					icon: "vertical_align_top",
					label: "Move to top",
					disabled: this.isTop() || this.movingToTop()
				},
				{
					id: "up",
					icon: "arrow_upward",
					label: "Move up",
					disabled: this.isFirst()
				},
				{
					id: "down",
					icon: "arrow_downward",
					label: "Move down",
					disabled: this.isLast()
				}
			);
		actions.push({
			id: "remove",
			icon: "playlist_remove",
			label: "Remove from Up Next",
			iconClass: "text-danger"
		});
		return actions;
	});

	protected runMenuAction(id: string) {
		if (id === "favorite") this.favoriteToggle.emit();
		else if (id === "top") this.moveToTop.emit();
		else if (id === "up") this.moveUp.emit();
		else if (id === "down") this.moveDown.emit();
		else if (id === "remove") this.remove.emit();
	}
}
