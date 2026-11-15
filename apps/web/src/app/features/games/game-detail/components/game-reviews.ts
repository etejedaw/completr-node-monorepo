import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	effect,
	inject,
	input,
	signal
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { form, FormField } from "@angular/forms/signals";
import { ActivatedRoute } from "@angular/router";
import { type Subscription } from "rxjs";

import { AuthService } from "../../../../core/services/auth";
import { RatingDistribution } from "../../../../shared/components/rating-distribution/rating-distribution";
import { ReviewCard } from "../../../../shared/components/review-card/review-card";
import { StarRating } from "../../../../shared/components/star-rating/star-rating";
import { getRatingLabel } from "../../../../shared/constants/rating-labels";
import {
	UiButton,
	UiEyebrow,
	UiPlainEmptyState,
	UiTextarea
} from "../../../../shared/ui";
import { BacklogService } from "../../../backlog/backlog";
import { REVIEWS_PAGE_SIZE, ReviewsService } from "../../reviews";
import { type Review } from "../../reviews.model";

const NOT_FOUND_STATUS = 404;
const RATING_BUCKETS = [5, 4, 3, 2, 1];

@Component({
	selector: "app-game-reviews",
	imports: [
		FormField,
		RatingDistribution,
		ReviewCard,
		StarRating,
		UiButton,
		UiEyebrow,
		UiPlainEmptyState,
		UiTextarea
	],
	templateUrl: "./game-reviews.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameReviews {
	private readonly authService = inject(AuthService);
	private readonly backlogService = inject(BacklogService);
	private readonly reviewsService = inject(ReviewsService);
	private readonly route = inject(ActivatedRoute);

	readonly gameId = input.required<string>();

	readonly reviews = signal<Review[]>([]);
	protected readonly myReview = signal<Review | null>(null);
	protected readonly show = signal(false);
	protected readonly submitting = signal(false);
	protected readonly reviewModel = signal<{
		content: string;
		rating: number | null;
	}>({ content: "", rating: null });
	readonly reviewForm = form(this.reviewModel);

	readonly reviewsCount = signal(0);
	protected readonly hasMoreReviews = signal(false);
	protected readonly loadingMore = signal(false);

	protected readonly ratingLabel = getRatingLabel;
	protected readonly communityReviews = computed(() => {
		const mine = this.myReview()?.id;
		return this.reviews().filter(review => review.id !== mine);
	});
	protected readonly ratedReviews = computed(() =>
		this.reviews().filter(review => !!review.rating)
	);
	protected readonly averageRating = computed(() => {
		const rated = this.ratedReviews();
		if (rated.length === 0) return null;
		const total = rated.reduce((sum, review) => sum + review.rating!, 0);
		return Math.round((total / rated.length) * 10) / 10;
	});
	protected readonly ratingDistribution = computed(() => {
		const rated = this.ratedReviews();
		return RATING_BUCKETS.map(stars => {
			const count = rated.filter(
				review => Math.ceil(review.rating!) === stars
			).length;
			return { stars, count };
		});
	});

	private readonly destroyRef = inject(DestroyRef);
	private reviewsRequest: Subscription | null = null;
	private actionRequest: Subscription | null = null;

	constructor() {
		this.destroyRef.onDestroy(() => {
			this.reviewsRequest?.unsubscribe();
			this.actionRequest?.unsubscribe();
		});
		effect(() => {
			const id = this.gameId();
			this.reset();
			if (id) this.loadReviews(id);
		});
	}

	private reset() {
		this.reviewsRequest?.unsubscribe();
		this.actionRequest?.unsubscribe();
		this.reviews.set([]);
		this.myReview.set(null);
		this.reviewsCount.set(0);
		this.hasMoreReviews.set(false);
		this.loadingMore.set(false);
		this.show.set(false);
		this.submitting.set(false);
		this.reviewModel.set({ content: "", rating: null });
	}

	private loadReviews(gameId: string) {
		this.reviewsRequest?.unsubscribe();
		this.reviewsRequest = this.reviewsService
			.getReviews(gameId)
			.subscribe(reviews => {
				this.reviews.set(reviews);
				this.reviewsCount.set(reviews.length);
				this.hasMoreReviews.set(reviews.length >= REVIEWS_PAGE_SIZE);
				this.loadingMore.set(false);
				const userId = this.authService.user()?.id;
				if (userId) {
					this.myReview.set(
						reviews.find(r => r.user?.id === userId) ?? null
					);
				}
				this.autoOpenIfRequested(gameId);
			});
	}

	protected loadMoreReviews() {
		const gameId = this.gameId();
		if (!gameId || this.loadingMore() || !this.hasMoreReviews()) return;
		this.loadingMore.set(true);
		this.reviewsRequest?.unsubscribe();
		this.reviewsRequest = this.reviewsService
			.getReviews(gameId, this.reviews().length)
			.subscribe({
				next: page => {
					const loaded = [...this.reviews(), ...page];
					this.reviews.set(loaded);
					this.reviewsCount.set(loaded.length);
					this.hasMoreReviews.set(page.length >= REVIEWS_PAGE_SIZE);
					this.loadingMore.set(false);
					const userId = this.authService.user()?.id;
					if (userId && !this.myReview()) {
						this.myReview.set(
							loaded.find(r => r.user?.id === userId) ?? null
						);
					}
				},
				error: () => this.loadingMore.set(false)
			});
	}

	private autoOpenIfRequested(gameId: string) {
		const shouldOpen =
			this.route.snapshot.queryParamMap.get("review") === "open";
		if (!shouldOpen) return;
		if (this.myReview()) {
			this.openForm();
			return;
		}
		this.backlogService
			.getMyBacklog({ game_id: gameId })
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: res => {
					const entry = res.data.backlog[0];
					if (entry) {
						this.reviewModel.set({
							content: entry.notes ?? "",
							rating: entry.userRating ?? null
						});
						this.show.set(true);
					} else {
						this.openForm();
					}
				},
				error: () => this.openForm()
			});
	}

	openForm() {
		const existing = this.myReview();
		this.reviewModel.set({
			content: existing?.content ?? "",
			rating: existing?.rating ?? null
		});
		this.show.set(true);
	}

	protected closeForm() {
		this.show.set(false);
	}

	protected submit() {
		const gameId = this.gameId();
		if (!gameId || this.submitting()) return;

		const state = this.reviewForm().value();
		const content = state.content.trim() || undefined;
		const rating = state.rating ?? undefined;
		if (!content && !rating) return;

		this.submitting.set(true);
		const existing = this.myReview();
		const action = existing
			? this.reviewsService.updateReview(gameId, { content, rating })
			: this.reviewsService.createReview(gameId, { content, rating });

		this.actionRequest = action.subscribe({
			next: () => {
				this.submitting.set(false);
				this.show.set(false);
				this.loadReviews(gameId);
			},
			error: err => {
				this.submitting.set(false);
				if (err.status === NOT_FOUND_STATUS)
					this.dropMissingReview(gameId);
			}
		});
	}

	protected deleteReview() {
		const gameId = this.gameId();
		if (!gameId || this.submitting()) return;
		this.submitting.set(true);
		this.actionRequest = this.reviewsService
			.deleteReview(gameId)
			.subscribe({
				next: () => {
					this.submitting.set(false);
					this.myReview.set(null);
					this.loadReviews(gameId);
				},
				error: err => {
					this.submitting.set(false);
					if (err.status === NOT_FOUND_STATUS)
						this.dropMissingReview(gameId);
				}
			});
	}

	private dropMissingReview(gameId: string) {
		this.show.set(false);
		this.myReview.set(null);
		this.loadReviews(gameId);
	}
}
