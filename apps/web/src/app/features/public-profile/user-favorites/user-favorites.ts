import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { AuthService } from "../../../core/services/auth.service";
import { PublicProfileService } from "../public-profile.service";
import { FavoriteEntry } from "../../../core/models";
import { UiPagination } from "../../../shared/ui";

const PAGE_SIZE = 50;

@Component({
	selector: "app-user-favorites",
	imports: [RouterLink, UiPagination],
	templateUrl: "./user-favorites.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserFavorites implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly profileService = inject(PublicProfileService);
	private readonly authService = inject(AuthService);

	protected readonly username = signal("");
	protected readonly entries = signal<FavoriteEntry[]>([]);
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = PAGE_SIZE;
	protected readonly Math = Math;
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

	private load(username: string) {
		this.isLoading.set(true);
		this.error.set(null);
		this.profileService
			.getUserFavorites(username, {
				limit: this.limit,
				offset: this.offset()
			})
			.subscribe({
				next: result => {
					this.entries.set(result.items);
					this.total.set(result.total);
					this.isLoading.set(false);
				},
				error: err => {
					if (err.status === 403) this.error.set("private");
					else if (err.status === 404) this.error.set("not_found");
					this.isLoading.set(false);
				}
			});
	}

	protected goToOffset(offset: number) {
		this.offset.set(offset);
		this.load(this.username());
	}
}
