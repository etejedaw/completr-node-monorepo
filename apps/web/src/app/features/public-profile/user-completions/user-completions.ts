import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { AuthService } from "../../../core/services/auth";
import { PublicReviewsService } from "../services/public-reviews.service";
import { StarRating } from "../../../shared/components/star-rating/star-rating";
import { UiPagination } from "../../../shared/ui";

const PAGE_SIZE = 20;

interface UserCompletion {
	id: string;
	status: string;
	userRating?: number | null;
	realDuration?: number | null;
	finishedAt?: string | null;
	reviewContent: string | null;
	game: {
		id: string;
		code: string;
		title: string;
		backgroundUrl?: string;
	};
	platform: { id: string; abbreviation: string };
}

@Component({
	selector: "app-user-completions",
	imports: [RouterLink, StarRating, UiPagination],
	templateUrl: "./user-completions.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserCompletions implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly reviewsService = inject(PublicReviewsService);
	private readonly authService = inject(AuthService);

	protected readonly username = signal("");
	protected readonly completions = signal<UserCompletion[]>([]);
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
			.getUserCompletions(username, {
				limit: this.limit,
				offset: this.offset()
			})
			.subscribe({
				next: res => {
					this.completions.set(res.completions);
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
