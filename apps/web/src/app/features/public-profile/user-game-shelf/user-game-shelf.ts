import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { DatePipe } from "@angular/common";
import { AuthService } from "../../../core/services/auth.service";
import { PublicProfileService } from "../public-profile.service";
import { GameShelfEntry } from "../../../core/models";
import { UiSearchBar } from "../../../shared/ui";

const PAGE_SIZE = 50;

@Component({
	selector: "app-user-game-shelf",
	imports: [RouterLink, DatePipe, UiSearchBar],
	templateUrl: "./user-game-shelf.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserGameShelf implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly profileService = inject(PublicProfileService);
	private readonly authService = inject(AuthService);

	protected readonly username = signal("");
	protected readonly entries = signal<GameShelfEntry[]>([]);
	private readonly allEntries = signal<GameShelfEntry[]>([]);
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = PAGE_SIZE;
	protected readonly Math = Math;
	protected readonly isLoading = signal(true);
	protected readonly error = signal<"not_found" | "private" | null>(null);
	protected readonly isLoggedIn = this.authService.isLoggedIn;
	protected readonly searchQuery = signal("");

	protected readonly viewMode = signal<"cards" | "grid" | "table">(
		(localStorage.getItem("completr.shelf.viewMode") as
			| "cards"
			| "grid"
			| "table") || "cards"
	);

	setViewMode(mode: "cards" | "grid" | "table") {
		this.viewMode.set(mode);
		localStorage.setItem("completr.shelf.viewMode", mode);
	}

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

	onSearch(query: string) {
		this.searchQuery.set(query);
		this.filterEntries();
	}

	private filterEntries() {
		const query = this.searchQuery().toLowerCase();
		if (!query) {
			this.entries.set(this.allEntries());
			return;
		}
		this.entries.set(
			this.allEntries().filter(e =>
				e.game.title.toLowerCase().includes(query)
			)
		);
	}

	prevPage() {
		this.offset.update(o => Math.max(0, o - this.limit));
		this.searchQuery.set("");
		this.load(this.username());
	}

	nextPage() {
		this.offset.update(o => o + this.limit);
		this.searchQuery.set("");
		this.load(this.username());
	}

	private load(username: string) {
		this.isLoading.set(true);
		this.error.set(null);
		this.profileService
			.getUserGameShelf(username, {
				limit: this.limit,
				offset: this.offset()
			})
			.subscribe({
				next: result => {
					this.allEntries.set(result.items);
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
}
