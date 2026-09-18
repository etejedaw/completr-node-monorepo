import {
	ChangeDetectionStrategy,
	Component,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";

import { AuthService } from "../../../core/services/auth";
import { StarRating } from "../../../shared/components/star-rating/star-rating";
import { UiPagination } from "../../../shared/ui";
import { PublicReviewsService } from "../services/public-reviews.service";

const PAGE_SIZE = 50;

interface UserReview {
	id: string;
	content?: string;
	rating?: number;
	playthroughDuration?: number | null;
	game: { id: string; code: string; title: string } | null;
	createdAt: string;
}

@Component({
	selector: "app-user-reviews",
	imports: [RouterLink, StarRating, UiPagination],
	templateUrl: "./user-reviews.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserReviews implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly reviewsService = inject(PublicReviewsService);
	private readonly authService = inject(AuthService);

	protected readonly username = signal("");
	protected readonly reviews = signal<UserReview[]>([]);
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = PAGE_SIZE;
	protected readonly isLoading = signal(true);
	protected readonly error = signal<"not_found" | "private" | null>(null);
	protected readonly isLoggedIn = this.authService.isLoggedIn;

	ngOnInit() {
		if (this.authService.token() && !this.authService.user()) {
			this.authService.loadUser().subscribe({
				next: () => this.init(),
				error: () => this.init()
			});
		} else {
			this.init();
		}
	}

	private init() {
		const username = this.route.snapshot.paramMap.get("username") ?? "";
		this.username.set(username);
		this.load(username);
	}

	goToOffset(offset: number) {
		this.offset.set(offset);
		this.load(this.username());
	}

	private load(username: string) {
		this.isLoading.set(true);
		this.error.set(null);
		this.reviewsService
			.getUserReviews(username, {
				limit: this.limit,
				offset: this.offset()
			})
			.subscribe({
				next: res => {
					this.reviews.set(res.reviews);
					this.total.set(res.total);
					this.isLoading.set(false);
				},
				error: err => {
					if (err.status === 403) this.error.set("private");
					else if (err.status === 404) this.error.set("not_found");
					this.isLoading.set(false);
				}
			});
	}
}
