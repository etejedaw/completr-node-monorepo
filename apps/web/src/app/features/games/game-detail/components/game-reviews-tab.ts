import {
	ChangeDetectionStrategy,
	Component,
	effect,
	inject,
	input,
	signal
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { form, FormField } from "@angular/forms/signals";
import { AuthService } from "../../../../core/services/auth";
import { BacklogService } from "../../../backlog/backlog";
import { ReviewsService, Review } from "../../reviews";
import { StarRating } from "../../../../shared/components/star-rating/star-rating";
import { UiButton, UiTextarea } from "../../../../shared/ui";

@Component({
	selector: "app-game-reviews-tab",
	imports: [RouterLink, FormField, StarRating, UiButton, UiTextarea],
	templateUrl: "./game-reviews-tab.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameReviewsTab {
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

	constructor() {
		effect(() => {
			const id = this.gameId();
			this.reset();
			if (id) this.loadReviews(id);
		});
	}

	private reset() {
		this.reviews.set([]);
		this.myReview.set(null);
		this.reviewsCount.set(0);
		this.show.set(false);
		this.submitting.set(false);
		this.reviewModel.set({ content: "", rating: null });
	}

	private loadReviews(gameId: string) {
		this.reviewsService.getReviews(gameId).subscribe(reviews => {
			this.reviews.set(reviews);
			this.reviewsCount.set(reviews.length);
			const userId = this.authService.user()?.id;
			if (userId) {
				this.myReview.set(
					reviews.find(r => r.user?.id === userId) ?? null
				);
			}
			this.autoOpenIfRequested(gameId);
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
		this.backlogService.getMyBacklog({ game_id: gameId }).subscribe({
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
		if (!gameId) return;

		const state = this.reviewForm().value();
		const content = state.content.trim() || undefined;
		const rating = state.rating ?? undefined;
		if (!content && !rating) return;

		this.submitting.set(true);
		const existing = this.myReview();
		const action = existing
			? this.reviewsService.updateReview(gameId, { content, rating })
			: this.reviewsService.createReview(gameId, { content, rating });

		action.subscribe({
			next: () => {
				this.submitting.set(false);
				this.show.set(false);
				this.loadReviews(gameId);
			},
			error: () => this.submitting.set(false)
		});
	}

	protected deleteReview() {
		const gameId = this.gameId();
		if (!gameId) return;
		this.reviewsService.deleteReview(gameId).subscribe(() => {
			this.myReview.set(null);
			this.loadReviews(gameId);
		});
	}
}
