import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { getRatingLabel } from "../../constants/rating-labels";
import { CoverUrlPipe } from "../../pipes/cover-url";
import { UiAvatar } from "../../ui";
import { ExpandableText } from "../expandable-text/expandable-text";
import { GamePoster } from "../game-poster/game-poster";
import { StarRating } from "../star-rating/star-rating";

export interface ReviewCardReview {
	content?: string | null;
	rating?: number | null;
	playthroughDuration?: number | null;
	createdAt: string;
	game?: {
		code: string;
		title: string;
		coverUrl?: string | null;
		backgroundUrl?: string | null;
	} | null;
	user?: {
		username: string;
		name?: string | null;
		avatarUrl?: string | null;
	} | null;
}

export type ReviewCardVariant = "card" | "row";
export type ReviewCardSubject = "game" | "author";

@Component({
	selector: "app-review-card",
	imports: [
		DatePipe,
		RouterLink,
		CoverUrlPipe,
		ExpandableText,
		GamePoster,
		StarRating,
		UiAvatar
	],
	templateUrl: "./review-card.html",
	host: { class: "block h-full" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReviewCard {
	readonly review = input.required<ReviewCardReview>();
	readonly variant = input<ReviewCardVariant>("card");
	readonly subject = input<ReviewCardSubject>("game");
	readonly highlighted = input(false);

	protected readonly posterUrl = computed(
		() => this.review().game?.coverUrl ?? this.review().game?.backgroundUrl
	);
	protected readonly authorName = computed(() => {
		const user = this.review().user;
		return user?.name || user?.username || "";
	});
	protected readonly ratingLabel = computed(() =>
		getRatingLabel(this.review().rating ?? null)
	);
	protected readonly showBackdrop = computed(
		() =>
			this.variant() === "card" &&
			this.subject() === "game" &&
			!!this.review().game?.backgroundUrl
	);
	protected readonly surfaceClass = computed(() => {
		if (this.variant() === "row") return "py-6";
		const tone = this.highlighted()
			? "bg-brand-subtle/60 border-brand/40"
			: "bg-surface border-line";
		return `overflow-hidden p-4 sm:p-5 rounded-card border ${tone}`;
	});
}
