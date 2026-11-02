import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal
} from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { map, of } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import { CoverGrid } from "../../../shared/components/cover-grid/cover-grid";
import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { SegmentedControl } from "../../../shared/components/segmented-control/segmented-control";
import { UiButton, UiEmptyState } from "../../../shared/ui";
import { ProfileCollectionPage } from "../components/profile-collection-page";
import { COMPARISON_OPTIONS } from "../services/comparison-options";
import { injectPublicCollection } from "../services/public-collection";
import {
	type ComparisonDimension,
	type ComparisonGame
} from "../services/public-library.model";
import { PublicLibraryService } from "../services/public-library.service";
import { type InCommonGame } from "./user-in-common.model";

const IN_COMMON_SUFFIX: Record<string, string> = {
	completed: " you both completed",
	not_started: " you both have yet to play"
};

function toInCommonGame(game: ComparisonGame): InCommonGame {
	return { ...game, backgroundUrl: game.backgroundUrl ?? undefined };
}

function parseDimension(value: string | null): ComparisonDimension {
	return COMPARISON_OPTIONS.some(option => option.value === value)
		? (value as ComparisonDimension)
		: "completed";
}

@Component({
	selector: "app-user-in-common",
	imports: [
		RouterLink,
		ProfileCollectionPage,
		CoverGrid,
		GameCoverCard,
		SegmentedControl,
		UiButton,
		UiEmptyState
	],
	templateUrl: "./user-in-common.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserInCommon {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly libraryService = inject(PublicLibraryService);

	protected readonly isLoggedIn = inject(AuthService).isLoggedIn;
	protected readonly options = COMPARISON_OPTIONS;
	protected readonly by = signal(
		parseDimension(this.route.snapshot.queryParamMap.get("by"))
	);

	protected readonly collection = injectPublicCollection<InCommonGame>(
		(username, pagination) =>
			this.isLoggedIn()
				? this.libraryService
						.getComparison(username, this.by(), pagination)
						.pipe(
							map(comparison => ({
								items: comparison.inCommon.map(toInCommonGame),
								total: comparison.counts.inCommon
							}))
						)
				: of({ items: [], total: 0 }),
		game => game
	);

	protected readonly subtitleSuffix = computed(
		() => IN_COMMON_SUFFIX[this.by()] ?? " in common"
	);

	protected changeDimension(by: ComparisonDimension) {
		if (by === this.by()) return;
		this.by.set(by);
		this.router.navigate([], {
			relativeTo: this.route,
			queryParams: { by },
			queryParamsHandling: "merge",
			replaceUrl: true
		});
		this.collection.goToOffset(0);
	}
}
