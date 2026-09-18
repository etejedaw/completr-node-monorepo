import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../../core/services/auth";
import { ToastService } from "../../core/services/toast";
import { FollowRequestsService } from "../../core/services/follow-requests";
import { Subject, debounceTime, switchMap } from "rxjs";
import { FeedService, FeedActivity, FeedCategory } from "./feed";
import {
	GlobalSearchService,
	SearchResults
} from "../../core/services/global-search";
import {
	activityLabel,
	activityIcon,
	activityIconColorClass
} from "../../shared/utils/activity-labels";
import { PremiumOnly } from "../../shared/directives/premium-only";

import {
	UiAvatar,
	UiButton,
	UiEmptyState,
	UiIconButton,
	UiInput,
	UiPagination,
	UiPremiumBadge,
	UiSelect
} from "../../shared/ui";

@Component({
	selector: "app-feed-page",
	imports: [
		RouterLink,
		UiAvatar,
		UiButton,
		UiEmptyState,
		UiInput,
		UiIconButton,
		UiPagination,
		UiPremiumBadge,
		UiSelect,
		PremiumOnly
	],
	templateUrl: "./feed-page.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeedPage implements OnInit {
	private readonly feedService = inject(FeedService);
	private readonly searchService = inject(GlobalSearchService);
	private readonly authService = inject(AuthService);
	private readonly toast = inject(ToastService);
	private readonly router = inject(Router);
	private readonly followRequestsService = inject(FollowRequestsService);
	private readonly searchSubject = new Subject<string>();

	protected readonly currentUserId = this.authService.user;
	protected readonly activities = signal<FeedActivity[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly searchQuery = signal("");
	protected readonly searchResults = signal<SearchResults | null>(null);
	protected readonly isSearching = signal(false);
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = 25;

	protected readonly filter = signal("");
	protected readonly filterOptions = [
		{ value: "", label: "All activity" },
		{ value: "cat:games", label: "Games" },
		{ value: "type:backlog_completed", label: "Completed only" },
		{ value: "type:backlog_abandoned", label: "Abandoned only" },
		{ value: "type:backlog_playing", label: "Started playing" },
		{ value: "type:game_reviewed", label: "Reviews" },
		{ value: "cat:lists", label: "Lists" },
		{ value: "cat:social", label: "Co-op & social" }
	];

	protected readonly followRequests = this.followRequestsService.incoming;
	protected readonly resolvingRequest = signal<string | null>(null);

	onOffsetChange(offset: number) {
		this.offset.set(offset);
		this.loadFeed();
	}

	onFilterChange(event: Event) {
		this.filter.set((event.target as HTMLSelectElement).value);
		this.offset.set(0);
		this.loadFeed();
	}

	private buildFilterParams(): { category?: FeedCategory; types?: string } {
		const value = this.filter();
		if (value.startsWith("cat:"))
			return { category: value.slice(4) as FeedCategory };
		if (value.startsWith("type:")) return { types: value.slice(5) };
		return {};
	}

	ngOnInit() {
		this.loadFeed();
		this.followRequestsService.list().subscribe();

		this.searchSubject
			.pipe(
				debounceTime(300),
				switchMap(query => {
					if (query.length < 2) {
						this.searchResults.set(null);
						this.isSearching.set(false);
						return [];
					}
					this.isSearching.set(true);
					return this.searchService.search(query);
				})
			)
			.subscribe(results => {
				this.searchResults.set(results);
				this.isSearching.set(false);
			});
	}

	onSearch(event: Event) {
		const query = (event.target as HTMLInputElement).value;
		this.searchQuery.set(query);
		if (query.length < 2) {
			this.searchResults.set(null);
			return;
		}
		this.searchSubject.next(query);
	}

	clearSearch() {
		this.searchQuery.set("");
		this.searchResults.set(null);
	}

	goToUser(username: string) {
		this.clearSearch();
		this.router.navigateByUrl(`/user/${username}`);
	}

	goToGame(code: string) {
		this.clearSearch();
		this.router.navigateByUrl(`/games/${code}`);
	}

	goToList(id: string) {
		this.clearSearch();
		this.router.navigateByUrl(`/lists/${id}`);
	}

	searchInGames() {
		const query = this.searchQuery();
		this.clearSearch();
		this.router.navigate(["/games"], { queryParams: { q: query } });
	}

	deleteActivity(id: string) {
		const snapshot = this.activities();
		const index = snapshot.findIndex(a => a.id === id);
		if (index === -1) return;
		const activity = snapshot[index];
		this.activities.set(snapshot.filter(a => a.id !== id));
		this.toast.pending({
			message: "Activity removed",
			onCommit: () => this.feedService.deleteActivity(id).subscribe(),
			onUndo: () => {
				const restored = [...this.activities()];
				restored.splice(index, 0, activity);
				this.activities.set(restored);
			}
		});
	}

	isOwnActivity(activity: FeedActivity): boolean {
		return activity.user?.id === this.currentUserId()?.id;
	}

	acceptFollowRequest(requesterId: string) {
		if (this.resolvingRequest()) return;
		this.resolvingRequest.set(requesterId);
		this.followRequestsService.accept(requesterId).subscribe({
			next: () => {
				this.resolvingRequest.set(null);
				this.toast.success("Follow request accepted.");
			},
			error: () => {
				this.resolvingRequest.set(null);
				this.toast.warning("Could not accept request.");
			}
		});
	}

	rejectFollowRequest(requesterId: string) {
		if (this.resolvingRequest()) return;
		this.resolvingRequest.set(requesterId);
		this.followRequestsService.reject(requesterId).subscribe({
			next: () => this.resolvingRequest.set(null),
			error: () => {
				this.resolvingRequest.set(null);
				this.toast.warning("Could not reject request.");
			}
		});
	}

	protected activityLabel = activityLabel;
	protected activityIcon = activityIcon;
	protected activityIconColorClass = activityIconColorClass;

	protected timeAgo(date: string): string {
		const diff = Date.now() - new Date(date).getTime();
		const minutes = Math.floor(diff / 60000);
		if (minutes < 1) return "just now";
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	private loadFeed() {
		this.isLoading.set(true);
		this.feedService
			.getFeed({
				limit: this.limit,
				offset: this.offset(),
				...this.buildFilterParams()
			})
			.subscribe({
				next: res => {
					this.activities.set(res.data.activities);
					this.total.set(res.data.total);
					this.isLoading.set(false);
				},
				error: () => this.isLoading.set(false)
			});
	}
}
