import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";

import { type BacklogEntry } from "../../../../core/models";
import {
	backlogStatusClass,
	backlogStatusIcon,
	backlogStatusLabel
} from "../../../../shared/utils/backlog-status";

export type GameLibraryActionsVariant = "full" | "compact";

interface SecondaryAction {
	id: "queue" | "wishlist" | "shelf" | "lists";
	icon: string;
	activeIcon: string;
	label: string;
	activeLabel: string;
	active: boolean;
	disabled: boolean;
	accentClass: string;
}

@Component({
	selector: "app-game-library-actions",
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

	readonly backlogRequested = output<void>();
	readonly runOpened = output<BacklogEntry>();
	readonly queueRequested = output<void>();
	readonly wishlistToggled = output<void>();
	readonly shelfRequested = output<void>();
	readonly listsRequested = output<void>();
	readonly favoriteToggled = output<void>();

	protected readonly statusClass = backlogStatusClass;
	protected readonly statusIcon = backlogStatusIcon;
	protected readonly statusLabel = backlogStatusLabel;

	protected readonly secondaryActions = computed<SecondaryAction[]>(() => {
		const listsCount = this.listsCount();
		return [
			{
				id: "queue",
				icon: "playlist_play",
				activeIcon: "playlist_add_check",
				label: "Up Next",
				activeLabel: "In Up Next",
				active: this.inQueue(),
				disabled: false,
				accentClass: "text-nav-queue"
			},
			{
				id: "wishlist",
				icon: "redeem",
				activeIcon: "redeem",
				label: "Want it",
				activeLabel: "Wanted",
				active: this.inWishlist(),
				disabled: this.togglingWishlist(),
				accentClass: "text-nav-wishlist"
			},
			{
				id: "shelf",
				icon: "shelves",
				activeIcon: "shelves",
				label: "Shelf",
				activeLabel: "On shelf",
				active: this.inShelf(),
				disabled: false,
				accentClass: "text-nav-shelf"
			},
			{
				id: "lists",
				icon: "format_list_bulleted_add",
				activeIcon: "playlist_add_check_circle",
				label: "Lists",
				activeLabel:
					listsCount === 1 ? "In 1 list" : `In ${listsCount} lists`,
				active: listsCount > 0,
				disabled: false,
				accentClass: "text-nav-lists"
			}
		];
	});

	protected runSecondary(id: SecondaryAction["id"]): void {
		if (id === "queue") this.queueRequested.emit();
		else if (id === "wishlist") this.wishlistToggled.emit();
		else if (id === "shelf") this.shelfRequested.emit();
		else this.listsRequested.emit();
	}

	protected openPrimary(): void {
		const run = this.latestRun();
		if (run) this.runOpened.emit(run);
		else this.backlogRequested.emit();
	}
}
