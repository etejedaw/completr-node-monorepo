import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";

import { type BacklogEntry } from "../../../../core/models";
import { ActionMenu } from "../../../../shared/components/action-menu/action-menu";
import { type ActionMenuItem } from "../../../../shared/components/action-menu/action-menu.model";
import { UiButton } from "../../../../shared/ui";
import {
	backlogStatusIcon,
	backlogStatusIconColor,
	backlogStatusLabel
} from "../../../../shared/utils/backlog-status";

export type GameLibraryActionsVariant = "full" | "compact";

@Component({
	selector: "app-game-library-actions",
	imports: [ActionMenu, UiButton],
	templateUrl: "./game-library-actions.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameLibraryActions {
	readonly variant = input<GameLibraryActionsVariant>("full");
	readonly latestRun = input<BacklogEntry | null>(null);
	readonly inQueue = input(false);
	readonly inWishlist = input(false);
	readonly inShelf = input(false);
	readonly listsCount = input(0);
	readonly favorite = input(false);
	readonly togglingFavorite = input(false);
	readonly togglingWishlist = input(false);
	readonly queueing = input(false);

	readonly backlogRequested = output<void>();
	readonly runOpened = output<BacklogEntry>();
	readonly queueRequested = output<void>();
	readonly wishlistToggled = output<void>();
	readonly shelfRequested = output<void>();
	readonly listsRequested = output<void>();
	readonly favoriteToggled = output<void>();

	protected readonly statusIconColor = backlogStatusIconColor;
	protected readonly statusIcon = backlogStatusIcon;
	protected readonly statusLabel = backlogStatusLabel;

	protected readonly libraryMenuItems = computed<ActionMenuItem[]>(() => {
		const listsCount = this.listsCount();
		const inQueue = this.inQueue();
		const inWishlist = this.inWishlist();
		const inShelf = this.inShelf();
		return [
			{
				id: "queue",
				label: inQueue ? "In Up Next" : "Add to Up Next",
				icon: inQueue ? "playlist_add_check" : "playlist_play",
				iconClass: inQueue ? "text-nav-queue" : undefined,
				hint: inQueue ? "Already in your queue" : undefined,
				disabled: inQueue,
				busy: this.queueing()
			},
			{
				id: "wishlist",
				label: inWishlist
					? "Remove from Want to Get"
					: "Add to Want to Get",
				icon: "redeem",
				iconClass: inWishlist ? "text-nav-wishlist" : undefined,
				hint: inWishlist ? "It's in your Want to Get" : undefined,
				busy: this.togglingWishlist()
			},
			{
				id: "shelf",
				label: inShelf ? "On My Shelf" : "Add to My Shelf",
				icon: "shelves",
				iconClass: inShelf ? "text-nav-shelf" : undefined,
				hint: inShelf ? "Add another copy" : undefined
			},
			{
				id: "lists",
				label:
					listsCount === 0
						? "Add to a list"
						: listsCount === 1
							? "In 1 list"
							: `In ${listsCount} lists`,
				icon:
					listsCount > 0
						? "playlist_add_check_circle"
						: "format_list_bulleted_add",
				iconClass: listsCount > 0 ? "text-nav-lists" : undefined,
				hint: listsCount > 0 ? "Add to or remove from lists" : undefined
			}
		];
	});

	protected runLibraryAction(id: string): void {
		if (id === "queue") this.queueRequested.emit();
		else if (id === "wishlist") this.wishlistToggled.emit();
		else if (id === "shelf") this.shelfRequested.emit();
		else if (id === "lists") this.listsRequested.emit();
	}

	protected openPrimary(): void {
		const run = this.latestRun();
		if (run) this.runOpened.emit(run);
		else this.backlogRequested.emit();
	}
}
