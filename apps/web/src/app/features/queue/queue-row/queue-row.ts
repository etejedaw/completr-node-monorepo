import { CdkDragHandle } from "@angular/cdk/drag-drop";
import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type QueueEntry } from "../../../core/models";
import { GamePoster } from "../../../shared/components/game-poster/game-poster";

@Component({
	selector: "app-queue-row",
	imports: [CdkDragHandle, RouterLink, GamePoster],
	templateUrl: "./queue-row.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class QueueRow {
	readonly entry = input.required<QueueEntry>();
	readonly position = input.required<number>();
	readonly reorderable = input(false);
	readonly isFirst = input(false);
	readonly isLast = input(false);
	readonly isFavorite = input(false);
	readonly statusUpdating = input(false);

	readonly startPlaying = output<void>();
	readonly favoriteToggle = output<void>();
	readonly remove = output<void>();
	readonly moveUp = output<void>();
	readonly moveDown = output<void>();
}
