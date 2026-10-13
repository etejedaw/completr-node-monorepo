import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type QueueEntry } from "../../../core/models";
import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import { CoverUrlPipe } from "../../../shared/pipes/cover-url";

@Component({
	selector: "app-queue-next-card",
	imports: [RouterLink, GamePoster, CoverUrlPipe],
	templateUrl: "./queue-next-card.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class QueueNextCard {
	readonly entry = input.required<QueueEntry>();
	readonly eyebrow = input("Play next");
	readonly readonly = input(false);
	readonly isFavorite = input(false);
	readonly statusUpdating = input(false);
	readonly canMoveDown = input(false);

	readonly startPlaying = output<void>();
	readonly favoriteToggle = output<void>();
	readonly remove = output<void>();
	readonly moveDown = output<void>();
}
