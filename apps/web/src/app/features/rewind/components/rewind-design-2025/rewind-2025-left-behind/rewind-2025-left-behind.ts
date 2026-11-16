import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import { RouterLink } from "@angular/router";

import {
	type RewindFinishedGame,
	type RewindLanguage
} from "../../../../../core/models/rewind.model";
import { GamePoster } from "../../../../../shared/components/game-poster/game-poster";
import { shortDate } from "../../../rewind-copy";
import { REWIND_ABANDONED_POSTER_CLASS } from "../../../rewind-tone";
import { rewindDesign2025Copy } from "../rewind-design-2025.copy";

function byAbandonedAt(a: RewindFinishedGame, b: RewindFinishedGame): number {
	return a.finishedAt.localeCompare(b.finishedAt);
}

@Component({
	selector: "app-rewind-2025-left-behind",
	imports: [GamePoster, RouterLink],
	templateUrl: "./rewind-2025-left-behind.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Rewind2025LeftBehind {
	readonly games = input.required<RewindFinishedGame[]>();
	readonly language = input<RewindLanguage>("en");

	protected readonly posterClass = REWIND_ABANDONED_POSTER_CLASS;

	protected readonly sortedGames = computed(() =>
		[...this.games()].sort(byAbandonedAt)
	);

	protected readonly copy = computed(() =>
		rewindDesign2025Copy(this.language())
	);

	protected dateOf(game: RewindFinishedGame): string {
		return shortDate(game.finishedAt, this.language());
	}
}
