import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { List, ListItem, Game } from "../../../core/models";
import { ListsService } from "../lists.service";
import { GamesService } from "../../games/games.service";
import {
	Subject,
	debounceTime,
	distinctUntilChanged,
	switchMap,
	of
} from "rxjs";

@Component({
	selector: "app-list-detail",
	imports: [RouterLink],
	templateUrl: "./list-detail.html",
	styleUrl: "./list-detail.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListDetail implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly listsService = inject(ListsService);
	private readonly gamesService = inject(GamesService);
	private readonly searchSubject = new Subject<string>();

	protected readonly list = signal<List | null>(null);
	protected readonly isLoading = signal(true);
	protected readonly refreshing = signal(false);
	protected readonly showAddSearch = signal(false);
	protected readonly searchQuery = signal("");
	protected readonly searchResults = signal<Game[]>([]);
	protected readonly isSearching = signal(false);

	private listId = "";

	ngOnInit() {
		this.listId = this.route.snapshot.paramMap.get("id") ?? "";
		if (this.listId) this.loadList();

		this.searchSubject
			.pipe(
				debounceTime(400),
				distinctUntilChanged(),
				switchMap(query => {
					if (query.length < 2) {
						this.isSearching.set(false);
						return of([]);
					}
					this.isSearching.set(true);
					return this.gamesService.search(query);
				})
			)
			.subscribe(games => {
				this.searchResults.set(games);
				this.isSearching.set(false);
			});
	}

	onSearch(event: Event) {
		const query = (event.target as HTMLInputElement).value;
		this.searchQuery.set(query);
		if (query.length >= 2) this.isSearching.set(true);
		this.searchSubject.next(query);
	}

	addGame(game: Game) {
		const current = this.list()?.items?.map(i => i.game.id) ?? [];
		if (current.includes(game.id)) return;
		this.listsService
			.replaceItems(this.listId, [...current, game.id])
			.subscribe(() => this.loadList());
	}

	removeItem(item: ListItem) {
		const remaining =
			this.list()
				?.items?.filter(i => i.id !== item.id)
				.map(i => i.game.id) ?? [];
		this.listsService
			.replaceItems(this.listId, remaining)
			.subscribe(() => this.loadList());
	}

	moveUp(index: number) {
		const items = [...(this.list()?.items ?? [])];
		if (index === 0) return;
		[items[index - 1], items[index]] = [items[index], items[index - 1]];
		this.replaceWithOrder(items);
	}

	moveDown(index: number) {
		const items = [...(this.list()?.items ?? [])];
		if (index >= items.length - 1) return;
		[items[index], items[index + 1]] = [items[index + 1], items[index]];
		this.replaceWithOrder(items);
	}

	refreshScores() {
		this.refreshing.set(true);
		this.listsService.refreshScores(this.listId).subscribe({
			next: () => {
				this.refreshing.set(false);
				this.loadList();
			},
			error: () => this.refreshing.set(false)
		});
	}

	statusClass(status: string | undefined): string {
		if (!status) return "";
		const map: Record<string, string> = {
			not_started: "status-not-started",
			playing: "status-playing",
			completed: "status-completed",
			abandoned: "status-abandoned"
		};
		return map[status] ?? "";
	}

	private loadList() {
		this.listsService.getById(this.listId).subscribe({
			next: list => {
				this.list.set(list);
				this.isLoading.set(false);
			},
			error: () => this.isLoading.set(false)
		});
	}

	private replaceWithOrder(items: ListItem[]) {
		const gameIds = items.map(i => i.game.id);
		this.listsService
			.replaceItems(this.listId, gameIds)
			.subscribe(() => this.loadList());
	}
}
