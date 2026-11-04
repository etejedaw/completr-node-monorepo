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

import { type Game, type OnlineSearchSource } from "../../../core/models";
import {
	ONLINE_SEARCH_UNAVAILABLE_HINT,
	ONLINE_SEARCH_UNAVAILABLE_TITLE,
	onlineSourceLabel
} from "../../constants/online-search";
import { UiButton, UiEyebrow, UiSearchBar, UiSkeleton } from "../../ui";
import { GamePoster } from "../game-poster/game-poster";
import { OnlineSourceNote } from "../online-source-note/online-source-note";

export type GameSearchStatus =
	"idle" | "searching" | "searchingOnline" | "done";

@Component({
	selector: "app-game-search-step",
	imports: [
		UiEyebrow,
		GamePoster,
		NgTemplateOutlet,
		OnlineSourceNote,
		UiButton,
		UiSearchBar,
		UiSkeleton
	],
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
	readonly onlineSearchUnavailable = input(false);
	readonly onlineSearchSource = input<OnlineSearchSource | undefined>(
		undefined
	);
	readonly placeholder = input("Search games by title...");
	readonly emptyHint = input("Try another spelling or a shorter title.");
	readonly autofocus = input(false);
	readonly picked = output<Game>();
	readonly searchOnline = output<void>();

	protected readonly skeletonRows = [0, 1, 2, 3];
	protected readonly unavailableTitle = ONLINE_SEARCH_UNAVAILABLE_TITLE;
	protected readonly unavailableHint = ONLINE_SEARCH_UNAVAILABLE_HINT;

	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

	constructor() {
		afterNextRender(() => {
			if (this.autofocus()) {
				this.host.nativeElement.querySelector("input")?.focus();
			}
		});
	}

	protected sourceLabel(): string {
		return onlineSourceLabel(this.onlineSearchSource());
	}

	protected releaseYear(game: Game): string | null {
		return game.releaseAt ? game.releaseAt.substring(0, 4) : null;
	}
}
