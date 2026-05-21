import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { Subject, debounceTime, switchMap } from "rxjs";
import { AuthService } from "../../../core/services/auth.service";
import {
	GlobalSearchService,
	SearchResults
} from "../../../core/services/global-search.service";

@Component({
	selector: "app-public-topbar",
	standalone: true,
	imports: [RouterLink],
	templateUrl: "./public-topbar.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicTopbar implements OnInit {
	private readonly authService = inject(AuthService);
	private readonly searchService = inject(GlobalSearchService);
	private readonly router = inject(Router);
	private readonly searchSubject = new Subject<string>();

	protected readonly isLoggedIn = this.authService.isLoggedIn;
	protected readonly searchQuery = signal("");
	protected readonly searchResults = signal<SearchResults | null>(null);
	protected readonly isSearching = signal(false);

	ngOnInit() {
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

	goBack() {
		history.length > 1 ? history.back() : this.router.navigateByUrl("/");
	}
}
