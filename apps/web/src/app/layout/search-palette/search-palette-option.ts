import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import { avatarRing } from "../../core/utils/premium";
import { BacklogStatusBadge } from "../../shared/components/backlog-status-badge/backlog-status-badge";
import { GamePoster } from "../../shared/components/game-poster/game-poster";
import { HighlightMatch } from "../../shared/components/highlight-match/highlight-match";
import { UiAvatar } from "../../shared/ui";
import { type SearchPaletteItem } from "./search-palette.model";

@Component({
	selector: "app-search-palette-option",
	imports: [BacklogStatusBadge, GamePoster, HighlightMatch, UiAvatar],
	templateUrl: "./search-palette-option.html",
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchPaletteOption {
	readonly item = input.required<SearchPaletteItem>();
	readonly query = input("");

	protected readonly avatarRing = avatarRing;

	protected readonly actionIcon = computed(() =>
		this.item().kind === "library-all" ? "arrow_forward" : "travel_explore"
	);

	protected readonly actionIconClass = computed(() =>
		this.item().kind === "library-all" ? "text-nav-backlog" : "text-brand"
	);

	protected readonly actionLabel = computed(() => {
		const item = this.item();
		if (item.kind === "library-all")
			return `See all ${item.total} in My Games`;
		return `Search the full catalog for "${this.query()}"`;
	});
}
