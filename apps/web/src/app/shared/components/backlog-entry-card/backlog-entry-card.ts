import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type BacklogEntry, type BacklogStatus } from "../../../core/models";
import { UiAvatar, UiBadge, UiEyebrow, UiIconButton } from "../../ui";
import {
	backlogStatusIcon,
	backlogStatusLabel
} from "../../utils/backlog-status";
import { isPlatinumRun } from "../../utils/platinum";
import { BacklogStatusBadge } from "../backlog-status-badge/backlog-status-badge";
import { BacklogStatusPicker } from "../backlog-status-picker/backlog-status-picker";
import { FlipCard } from "../flip-card/flip-card";
import { GamePoster } from "../game-poster/game-poster";
import { MoodTagsChips } from "../mood-tags-chips/mood-tags-chips";
import { PlatinumTrophy } from "../platinum-trophy/platinum-trophy";
import { RatioSummary } from "../ratio-summary/ratio-summary";
import { StarRating } from "../star-rating/star-rating";

const PROGRESS_VISIBLE_STATUSES: ReadonlySet<BacklogStatus> = new Set([
	"playing",
	"endless",
	"not_started"
]);

const CHANGEABLE_STATUSES: ReadonlySet<BacklogStatus> = new Set([
	"not_started",
	"playing",
	"endless"
]);

@Component({
	selector: "app-backlog-entry-card",
	imports: [
		BacklogStatusBadge,
		BacklogStatusPicker,
		DatePipe,
		RouterLink,
		FlipCard,
		GamePoster,
		MoodTagsChips,
		PlatinumTrophy,
		RatioSummary,
		StarRating,
		UiAvatar,
		UiBadge,
		UiEyebrow,
		UiIconButton
	],
	templateUrl: "./backlog-entry-card.html",
	host: {
		class: "relative flex flex-col h-full [content-visibility:auto] [overflow-clip-margin:3rem] [contain-intrinsic-size:auto_180px] max-sm:[contain-intrinsic-size:auto_225px]"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogEntryCard {
	readonly entry = input.required<BacklogEntry>();
	readonly readonly = input(false);
	readonly favorite = input(false);
	readonly inQueue = input(false);
	readonly flipped = input(false);
	readonly statusUpdating = input(false);
	readonly coarsePointer = input(false);

	readonly opened = output<Event>();
	readonly favoriteToggled = output<Event>();
	readonly queueToggled = output<Event>();
	readonly flipToggled = output<Event>();
	readonly statusChanged = output<BacklogStatus>();
	readonly startPlayingRequested = output<Event>();
	readonly completeRequested = output<Event>();
	readonly quickRated = output<number | null>();
	readonly ratingSheetRequested = output<Event>();

	protected readonly statusIcon = backlogStatusIcon;

	protected readonly cardLabel = computed(() => {
		const entry = this.entry();
		return `${entry.game.title}, ${backlogStatusLabel(entry.status)}`;
	});
	protected readonly cardDescriptionId = computed(
		() => `entry-card-details-${this.entry().id}`
	);

	protected readonly hasAnnotations = computed(() => {
		const entry = this.entry();
		return !!entry.notes || (!!entry.hasReview && !!entry.reviewContent);
	});
	protected readonly showsProgress = computed(() => {
		const entry = this.entry();
		return (
			!!entry.latestProgress &&
			PROGRESS_VISIBLE_STATUSES.has(entry.status)
		);
	});
	protected readonly canChangeStatus = computed(
		() => !this.readonly() && CHANGEABLE_STATUSES.has(this.entry().status)
	);
	protected readonly canQuickRate = computed(() => {
		const entry = this.entry();
		return (
			!this.readonly() &&
			entry.status !== "not_started" &&
			entry.userRating == null
		);
	});
	protected readonly isPlatinumRun = computed(() =>
		isPlatinumRun(this.entry())
	);
	protected readonly hasMobileBar = computed(
		() => !this.readonly() || this.hasAnnotations()
	);
}
