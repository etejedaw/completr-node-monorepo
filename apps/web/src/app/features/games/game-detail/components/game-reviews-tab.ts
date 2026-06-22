import {
	ChangeDetectionStrategy,
	Component,
	effect,
	inject,
	input,
	signal
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { AuthService } from "../../../../core/services/auth";
import { BacklogService } from "../../../backlog/backlog";
import { ReviewsService, Review } from "../../reviews";
import { StarRating } from "../../../../shared/components/star-rating/star-rating";
import { UiButton, UiTextarea } from "../../../../shared/ui";

interface ReviewFormState {
	show: boolean;
	content: string;
	rating: number | null;
	submitting: boolean;
}

@Component({
	selector: "app-game-reviews-tab",
	imports: [RouterLink, FormsModule, StarRating, UiButton, UiTextarea],
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
	protected readonly form = signal<ReviewFormState>({
		show: false,
		content: "",
		rating: null,
		submitting: false
	});

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
		this.form.set({ show: false, content: "", rating: null, submitting: false });
	}

	private loadReviews(gameId: string) {
		this.reviewsService.getReviews(gameId).subscribe(reviews => {
			this.reviews.set(reviews);
			this.reviewsCount.set(reviews.length);
			const userId = this.authService.user()?.id;
			if (userId) {
				this.myReview.set(reviews.find(r => r.user?.id === userId) ?? null);
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
					this.update({
						show: true,
						rating: entry.userRating ?? null,
						content: entry.notes ?? ""
					});
				} else {
					this.openForm();
				}
			},
			error: () => this.openForm()
		});
	}

	protected update(patch: Partial<ReviewFormState>) {
		this.form.update(s => ({ ...s, ...patch }));
	}

	openForm() {
		const existing = this.myReview();
		this.update({
			show: true,
			content: existing?.content ?? "",
			rating: existing?.rating ?? null
		});
	}

	protected closeForm() {
		this.update({ show: false });
	}

	protected submit() {
		const gameId = this.gameId();
		if (!gameId) return;

		const state = this.form();
		const content = state.content.trim() || undefined;
		const rating = state.rating ?? undefined;
		if (!content && !rating) return;

		this.update({ submitting: true });
		const existing = this.myReview();
		const action = existing
			? this.reviewsService.updateReview(gameId, { content, rating })
			: this.reviewsService.createReview(gameId, { content, rating });

		action.subscribe({
			next: () => {
				this.update({ submitting: false, show: false });
				this.loadReviews(gameId);
			},
			error: () => this.update({ submitting: false })
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
