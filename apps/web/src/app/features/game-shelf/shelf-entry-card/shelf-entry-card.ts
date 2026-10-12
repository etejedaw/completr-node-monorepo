import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type GameShelfEntry } from "../../../core/models";
import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import { MoodTagsChips } from "../../../shared/components/mood-tags-chips/mood-tags-chips";

@Component({
	selector: "app-shelf-entry-card",
	imports: [DatePipe, RouterLink, GamePoster, MoodTagsChips],
	templateUrl: "./shelf-entry-card.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShelfEntryCard {
	readonly entry = input.required<GameShelfEntry>();
	readonly favorite = input(false);
	readonly wanted = input(false);

	readonly opened = output<void>();
	readonly favoriteToggled = output<void>();
	readonly wantedToggled = output<void>();
	readonly libraryRequested = output<void>();
}
