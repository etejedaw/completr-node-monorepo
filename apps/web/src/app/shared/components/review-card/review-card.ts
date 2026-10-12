import { DatePipe } from "@angular/common";
import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	type ElementRef,
	inject,
	input,
	signal,
	viewChild
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { CoverUrlPipe } from "../../pipes/cover-url";
import { GamePoster } from "../game-poster/game-poster";
import { StarRating } from "../star-rating/star-rating";

export interface ReviewCardReview {
	content?: string | null;
	rating?: number | null;
	playthroughDuration?: number | null;
	createdAt: string;
	game: {
		code: string;
		title: string;
		coverUrl?: string | null;
		backgroundUrl?: string | null;
	} | null;
}

export type ReviewCardVariant = "card" | "row";

@Component({
	selector: "app-review-card",
	imports: [DatePipe, RouterLink, CoverUrlPipe, GamePoster, StarRating],
	templateUrl: "./review-card.html",
	host: { class: "block h-full" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReviewCard {
	readonly review = input.required<ReviewCardReview>();
	readonly variant = input<ReviewCardVariant>("card");

	protected readonly expanded = signal(false);
	protected readonly posterUrl = computed(
		() => this.review().game?.coverUrl ?? this.review().game?.backgroundUrl
	);
	private readonly content =
		viewChild<ElementRef<HTMLElement>>("reviewContent");
	private readonly isClamped = signal(false);
	protected readonly showToggle = computed(
		() => this.expanded() || this.isClamped()
	);

	constructor() {
		const destroyRef = inject(DestroyRef);
		afterNextRender(() => {
			const element = this.content()?.nativeElement;
			if (!element) return;
			const observer = new ResizeObserver(() =>
				this.measureClamp(element)
			);
			observer.observe(element);
			destroyRef.onDestroy(() => observer.disconnect());
		});
	}

	private measureClamp(element: HTMLElement) {
		if (this.expanded()) return;
		this.isClamped.set(element.scrollHeight > element.clientHeight + 1);
	}
}
