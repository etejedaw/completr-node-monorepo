import { NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { debounceTime, of, Subject, switchMap } from "rxjs";

import { AuthService } from "../../core/services/auth";
import { type UserResult, UsersService } from "../../core/services/users";
import { LibraryHero } from "../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../shared/components/library-toolbar/library-toolbar";
import { UiEmptyState, UiSearchBar, UiSkeleton } from "../../shared/ui";
import { injectFollowActions } from "./follow-actions";
import { type FollowState, UserCard } from "./user-card/user-card";

const DISCOVER_LIMIT = 12;
const SEARCH_LIMIT = 30;
const EMAIL_PATTERN = /.+@.+\..+/;

@Component({
	selector: "app-users-discover",
	imports: [
		NgTemplateOutlet,
		LibraryHero,
		LibraryToolbar,
		UserCard,
		UiEmptyState,
		UiSearchBar,
		UiSkeleton
	],
	templateUrl: "./users-discover.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersDiscover implements OnInit {
	private readonly usersService = inject(UsersService);
	private readonly searchSubject = new Subject<string>();

	protected readonly isLoggedIn = inject(AuthService).isLoggedIn;
	protected readonly discoverUsers = signal<UserResult[]>([]);
	protected readonly searchResults = signal<UserResult[]>([]);
	protected readonly searchQuery = signal("");
	protected readonly isLoadingDiscover = signal(true);
	protected readonly isSearching = signal(false);
	protected readonly skeletonRange = Array.from({ length: 6 }, (_, i) => i);
	private readonly followActions = injectFollowActions();

	protected readonly heroPosters = computed(() =>
		[...this.discoverUsers(), ...this.searchResults()].flatMap(user =>
			user.featuredGame?.backgroundUrl
				? [
						{
							src: user.featuredGame.backgroundUrl,
							title: user.featuredGame.title
						}
					]
				: []
		)
	);

	ngOnInit() {
		this.loadDiscover();

		this.searchSubject
			.pipe(
				debounceTime(400),
				switchMap(query => {
					const trimmed = query.trim();
					if (trimmed.length < 2) {
						this.isSearching.set(false);
						return of<UserResult[]>([]);
					}
					this.isSearching.set(true);
					return EMAIL_PATTERN.test(trimmed)
						? this.usersService.search({ email: trimmed })
						: this.usersService.search({
								q: trimmed,
								limit: SEARCH_LIMIT
							});
				})
			)
			.subscribe(users => {
				this.searchResults.set(users);
				this.isSearching.set(false);
			});
	}

	onSearch(query: string) {
		this.searchQuery.set(query);
		if (query.trim().length >= 2) this.isSearching.set(true);
		this.searchSubject.next(query);
	}

	protected withLiveCounts(user: UserResult): UserResult {
		return this.followActions.withLiveCounts(user);
	}

	protected followStateOf(user: UserResult): FollowState {
		return this.followActions.followStateOf(user);
	}

	protected isBusy(user: UserResult): boolean {
		return this.followActions.isBusy(user);
	}

	protected toggleFollow(user: UserResult) {
		this.followActions.toggleFollow(user);
	}

	private loadDiscover() {
		this.isLoadingDiscover.set(true);
		this.usersService.discover(DISCOVER_LIMIT).subscribe({
			next: users => {
				this.discoverUsers.set(users);
				this.isLoadingDiscover.set(false);
			},
			error: () => this.isLoadingDiscover.set(false)
		});
	}
}
