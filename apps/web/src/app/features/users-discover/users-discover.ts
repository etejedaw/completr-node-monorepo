import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { Subject, debounceTime, switchMap, of } from "rxjs";
import { UiAvatar, UiSearchBar } from "../../shared/ui";
import { UserResult, UsersService } from "../../core/services/users";

@Component({
	selector: "app-users-discover",
	imports: [RouterLink, UiAvatar, UiSearchBar],
	templateUrl: "./users-discover.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersDiscover implements OnInit {
	private readonly usersService = inject(UsersService);
	private readonly searchSubject = new Subject<string>();

	protected readonly discoverUsers = signal<UserResult[]>([]);
	protected readonly searchResults = signal<UserResult[]>([]);
	protected readonly searchQuery = signal("");
	protected readonly isLoadingDiscover = signal(true);
	protected readonly isSearching = signal(false);

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
					const isEmail =
						trimmed.includes("@") && /.+@.+\..+/.test(trimmed);
					return isEmail
						? this.usersService.search({ email: trimmed })
						: this.usersService.search({ q: trimmed, limit: 30 });
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

	private loadDiscover() {
		this.isLoadingDiscover.set(true);
		this.usersService.discover(12).subscribe({
			next: users => {
				this.discoverUsers.set(users);
				this.isLoadingDiscover.set(false);
			},
			error: () => this.isLoadingDiscover.set(false)
		});
	}
}
