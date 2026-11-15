import { NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";

import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { PosterShelf } from "../../../shared/components/poster-shelf/poster-shelf";
import { SegmentedControl } from "../../../shared/components/segmented-control/segmented-control";
import { type SegmentedOption } from "../../../shared/components/segmented-control/segmented-control.model";
import { UiSkeleton } from "../../../shared/ui";
import {
	type ComparisonDimension,
	type ComparisonGame
} from "../services/public-library.model";
import { ProfileSectionHeader } from "./profile-section-header";

const SKELETON_RANGE = [0, 1, 2, 3, 4, 5];

@Component({
	selector: "app-profile-in-common",
	imports: [
		NgTemplateOutlet,
		GameCoverCard,
		PosterShelf,
		ProfileSectionHeader,
		SegmentedControl,
		UiSkeleton
	],
	templateUrl: "./profile-in-common.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileInCommon {
	readonly username = input.required<string>();
	readonly options = input.required<SegmentedOption<ComparisonDimension>[]>();
	readonly selected = input.required<ComparisonDimension>();
	readonly games = input<ComparisonGame[]>([]);
	readonly count = input(0);
	readonly loading = input(false);
	readonly isPrivate = input(false);

	readonly selectedChange = output<ComparisonDimension>();

	protected readonly skeletonRange = SKELETON_RANGE;
	protected readonly cards = computed(() =>
		this.games().map(game => ({
			...game,
			backgroundUrl: game.backgroundUrl ?? undefined
		}))
	);
}
