import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { DatePipe } from "@angular/common";
import { Subject, debounceTime, distinctUntilChanged } from "rxjs";
import { AuthService } from "../../../core/services/auth";
import { PublicLibraryService } from "../services/public-library.service";
import { BacklogEntry, BacklogStatus } from "../../../core/models";
import { StarRating } from "../../../shared/components/star-rating/star-rating";
import { PersonalStats } from "../../../shared/components/personal-stats/personal-stats";
import { UiPagination, UiSearchBar } from "../../../shared/ui";

const PAGE_SIZE = 50;

@Component({
	selector: "app-user-backlog",
	imports: [
		RouterLink,
		DatePipe,
		StarRating,
		PersonalStats,
		UiPagination,
		UiSearchBar
	],
	templateUrl: "./user-backlog.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserBacklog implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly libraryService = inject(PublicLibraryService);
	private readonly authService = inject(AuthService);

	protected readonly username = signal("");
	protected readonly entries = signal<BacklogEntry[]>([]);
	protected readonly total = signal(0);
	protected readonly searchQuery = signal("");
	protected readonly offset = signal(0);
	protected readonly isLoading = signal(true);
	protected readonly error = signal<"not_found" | "private" | null>(null);
	protected readonly isLoggedIn = this.authService.isLoggedIn;
	protected readonly activeStatus = signal("");
	protected readonly limit = PAGE_SIZE;
	protected readonly Math = Math;

	private readonly searchSubject = new Subject<string>();

	protected readonly statusTabs = [
		{ label: "All", value: "" },
		{ label: "Not Started", value: "not_started" },
		{ label: "Playing", value: "playing" },
		{ label: "Completed", value: "completed" },
		{ label: "Endless", value: "endless" },
		{ label: "Abandoned", value: "abandoned" }
	];

	protected readonly expandedReviews = signal<Set<string>>(new Set());

	toggleReview(id: string) {
		const next = new Set(this.expandedReviews());
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		this.expandedReviews.set(next);
	}

	isReviewExpanded(id: string): boolean {
		return this.expandedReviews().has(id);
	}

	needsReviewToggle(content: string | null | undefined): boolean {
		return !!content && content.length > 180;
	}

	ngOnInit() {
		this.searchSubject
			.pipe(debounceTime(300), distinctUntilChanged())
			.subscribe(query => {
				this.searchQuery.set(query);
				this.offset.set(0);
				this.load();
			});

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
		const status = this.route.snapshot.queryParamMap.get("status") ?? "";
		this.activeStatus.set(status);
		this.load();
	}

	onSearch(query: string) {
		this.searchSubject.next(query);
	}

	filterByStatus(status: string) {
		this.activeStatus.set(status);
		this.offset.set(0);
		this.load();
	}

	goToOffset(offset: number) {
		this.offset.set(offset);
		this.load();
	}

	statusClass(status: BacklogStatus): string {
		const map: Record<BacklogStatus, string> = {
			not_started: "status-not-started",
			playing: "status-playing",
			completed: "status-completed",
			abandoned: "status-abandoned",
			endless: "status-endless"
		};
		return map[status] ?? "";
	}

	statusLabel(status: BacklogStatus): string {
		const map: Record<BacklogStatus, string> = {
			not_started: "Not Started",
			playing: "Playing",
			completed: "Completed",
			abandoned: "Abandoned",
			endless: "Endless"
		};
		return map[status] ?? status;
	}

	private defaultSortForStatus(status: string): {
		sort_by: string;
		sort_order: string;
	} {
		switch (status) {
			case "playing":
				return { sort_by: "startedAt", sort_order: "desc" };
			case "completed":
			case "abandoned":
				return { sort_by: "finishedAt", sort_order: "desc" };
			case "endless":
				return { sort_by: "startedAt", sort_order: "desc" };
			default:
				return { sort_by: "createdAt", sort_order: "desc" };
		}
	}

	private load() {
		this.isLoading.set(true);
		this.error.set(null);

		const sort = this.defaultSortForStatus(this.activeStatus());
		const filters: Record<string, string | number> = {
			limit: this.limit,
			offset: this.offset(),
			sort_by: sort.sort_by,
			sort_order: sort.sort_order
		};
		if (this.activeStatus()) filters["status"] = this.activeStatus();
		if (this.searchQuery()) filters["search"] = this.searchQuery();

		this.libraryService.getUserBacklog(this.username(), filters).subscribe({
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
