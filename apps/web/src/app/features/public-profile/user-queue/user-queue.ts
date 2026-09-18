import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { AuthService } from "../../../core/services/auth";
import { PublicLibraryService } from "../services/public-library.service";
import { QueueEntry } from "../../../core/models";
import { UiPagination, UiSearchBar } from "../../../shared/ui";
import { QueueGridCard } from "../../../shared/components/queue-grid-card/queue-grid-card";

const PAGE_SIZE = 50;

@Component({
	selector: "app-user-queue",
	imports: [RouterLink, UiPagination, UiSearchBar, QueueGridCard],
	templateUrl: "./user-queue.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserQueue implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly libraryService = inject(PublicLibraryService);
	private readonly authService = inject(AuthService);

	protected readonly username = signal("");
	protected readonly entries = signal<QueueEntry[]>([]);
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = PAGE_SIZE;
	protected readonly Math = Math;
	protected readonly isLoading = signal(true);
	protected readonly error = signal<"not_found" | "private" | null>(null);
	protected readonly isLoggedIn = this.authService.isLoggedIn;
	protected readonly searchQuery = signal("");
	protected readonly filteredEntries = computed(() => {
		const q = this.searchQuery().toLowerCase().trim();
		if (!q) return this.entries();
		return this.entries().filter(e =>
			e.backlog.game.title.toLowerCase().includes(q)
		);
	});

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
		this.libraryService
			.getUserQueue(username, {
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
}
