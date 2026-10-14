import { NgTemplateOutlet } from "@angular/common";
import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	inject,
	input,
	model,
	output
} from "@angular/core";

import { type Game } from "../../../core/models";
import { UiButton, UiSearchBar, UiSkeleton } from "../../ui";
import { GamePoster } from "../game-poster/game-poster";

export type GameSearchStatus =
	"idle" | "searching" | "searchingOnline" | "done";

@Component({
	selector: "app-game-search-step",
	imports: [GamePoster, NgTemplateOutlet, UiButton, UiSearchBar, UiSkeleton],
	templateUrl: "./game-search-step.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameSearchStep {
	readonly query = model("");
	readonly results = input.required<readonly Game[]>();
	readonly status = input.required<GameSearchStatus>();
	readonly allowOnline = input(true);
	readonly onlineSearching = input(false);
	readonly placeholder = input("Search games by title...");
	readonly emptyHint = input("Try another spelling or a shorter title.");
	readonly autofocus = input(false);
	readonly picked = output<Game>();
	readonly searchOnline = output<void>();

	protected readonly skeletonRows = [0, 1, 2, 3];

	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

	constructor() {
		afterNextRender(() => {
			if (this.autofocus()) {
				this.host.nativeElement.querySelector("input")?.focus();
			}
		});
	}

	protected releaseYear(game: Game): string | null {
		return game.releaseAt ? game.releaseAt.substring(0, 4) : null;
	}
}
