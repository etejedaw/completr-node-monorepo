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
import { MenuKeyboard } from "../../directives/menu-keyboard";
import { UiAvatar } from "../../ui";
import {
	backlogStatusClass,
	backlogStatusIcon,
	backlogStatusIconColor,
	backlogStatusLabel
} from "../../utils/backlog-status";
import { isPlatinumRun } from "../../utils/platinum";
import { FlipCard } from "../flip-card/flip-card";
import { GamePoster } from "../game-poster/game-poster";
import { PlatinumTrophy } from "../platinum-trophy/platinum-trophy";
import { RatioSummary } from "../ratio-summary/ratio-summary";
import { StarRating } from "../star-rating/star-rating";

export interface BacklogStatusOption {
	label: string;
	value: string;
}

export interface BacklogStatusSelection {
	status: string;
	event: Event;
}

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
		DatePipe,
		RouterLink,
		FlipCard,
		GamePoster,
		MenuKeyboard,
		PlatinumTrophy,
		RatioSummary,
		StarRating,
		UiAvatar
	],
	templateUrl: "./backlog-entry-card.html",
	host: {
		class: "relative flex flex-col h-full [overflow-clip-margin:3rem] [contain-intrinsic-size:auto_180px] max-sm:[contain-intrinsic-size:auto_225px]",
		"[style.content-visibility]": "statusMenuOpen() ? 'visible' : 'auto'"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BacklogEntryCard {
	readonly entry = input.required<BacklogEntry>();
	readonly readonly = input(false);
	readonly favorite = input(false);
	readonly inQueue = input(false);
	readonly flipped = input(false);
	readonly statusMenuOpen = input(false);
	readonly statusUpdating = input(false);
	readonly coarsePointer = input(false);
	readonly statusOptions = input<BacklogStatusOption[]>([]);

	readonly opened = output<Event>();
	readonly favoriteToggled = output<Event>();
	readonly queueToggled = output<Event>();
	readonly flipToggled = output<Event>();
	readonly statusMenuToggled = output<Event>();
	readonly statusMenuClosed = output<void>();
	readonly statusSelected = output<BacklogStatusSelection>();
	readonly startPlayingRequested = output<Event>();
	readonly completeRequested = output<Event>();
	readonly quickRated = output<number | null>();
	readonly ratingSheetRequested = output<Event>();

	protected readonly statusClass = backlogStatusClass;
	protected readonly statusIcon = backlogStatusIcon;
	protected readonly statusIconColor = backlogStatusIconColor;
	protected readonly statusLabel = backlogStatusLabel;

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
	protected readonly showsGameTrophy = computed(
		() => !!this.entry().platinum && !this.isPlatinumRun()
	);
	protected readonly hasMobileBar = computed(
		() => !this.readonly() || this.hasAnnotations()
	);
}
