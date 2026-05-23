import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { Subject, debounceTime, switchMap } from "rxjs";
import { FeedService, FeedActivity } from "./feed.service";
import {
	GlobalSearchService,
	SearchResults
} from "../../core/services/global-search.service";
import {
	activityLabel,
	activityIcon,
	activityIconColorClass
} from "../../shared/utils/activity-labels";

import { UiButton, UiEmptyState, UiIconButton, UiInput, UiPagination } from "../../shared/ui";

@Component({
	selector: "app-feed-page",
	imports: [RouterLink, UiButton, UiEmptyState, UiInput, UiIconButton, UiPagination],
	templateUrl: "./feed-page.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeedPage implements OnInit {
	private readonly feedService = inject(FeedService);
	private readonly searchService = inject(GlobalSearchService);
	private readonly authService = inject(AuthService);
	private readonly router = inject(Router);
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

	onOffsetChange(offset: number) {
		this.offset.set(offset);
		this.loadFeed();
	}

	ngOnInit() {
		this.loadFeed();

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
		this.feedService.deleteActivity(id).subscribe({
			next: () =>
				this.activities.update(list => list.filter(a => a.id !== id))
		});
	}

	isOwnActivity(activity: FeedActivity): boolean {
		return activity.user?.id === this.currentUserId()?.id;
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
			.getFeed({ limit: this.limit, offset: this.offset() })
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
