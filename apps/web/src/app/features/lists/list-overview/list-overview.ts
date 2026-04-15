import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { Subject, debounceTime, switchMap, of } from "rxjs";
import { List, FollowingList } from "../../../core/models";
import { ListsService } from "../lists.service";
import { ListModal } from "../list-modal/list-modal";

@Component({
	selector: "app-list-overview",
	imports: [RouterLink, ListModal],
	templateUrl: "./list-overview.html",
	styleUrl: "./list-overview.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListOverview implements OnInit {
	private readonly listsService = inject(ListsService);
	private readonly searchSubject = new Subject<string>();

	protected readonly lists = signal<List[]>([]);
	protected readonly followingLists = signal<FollowingList[]>([]);
	protected readonly frozen = signal(false);
	protected readonly isLoading = signal(true);
	protected readonly showModal = signal(false);
	protected readonly editingList = signal<List | null>(null);
	protected readonly searchQuery = signal("");
	protected readonly searchResults = signal<List[]>([]);
	protected readonly isSearching = signal(false);

	ngOnInit() {
		this.loadLists();
		this.loadFollowing();

		this.searchSubject
			.pipe(
				debounceTime(400),
				switchMap(query => {
					if (query.length < 2) {
						this.isSearching.set(false);
						return of([]);
					}
					this.isSearching.set(true);
					return this.listsService.search(query);
				})
			)
			.subscribe(lists => {
				this.searchResults.set(lists);
				this.isSearching.set(false);
			});
	}

	onSearch(event: Event) {
		const query = (event.target as HTMLInputElement).value;
		this.searchQuery.set(query);
		if (query.length >= 2) this.isSearching.set(true);
		this.searchSubject.next(query);
	}

	openCreate() {
		this.editingList.set(null);
		this.showModal.set(true);
	}

	openEdit(list: List, event: Event) {
		event.stopPropagation();
		this.editingList.set(list);
		this.showModal.set(true);
	}

	onModalClosed() {
		this.showModal.set(false);
		this.editingList.set(null);
	}

	onModalSaved() {
		this.showModal.set(false);
		this.editingList.set(null);
		this.loadLists();
	}

	progressPercent(p: { completed: number; total: number }): number {
		return p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
	}

	private loadLists() {
		this.isLoading.set(true);
		this.listsService.getMyLists().subscribe({
			next: res => {
				this.lists.set(res.data.lists);
				this.frozen.set(res.data.frozen);
				this.isLoading.set(false);
			},
			error: () => this.isLoading.set(false)
		});
	}

	private loadFollowing() {
		this.listsService.getFollowing().subscribe({
			next: lists => this.followingLists.set(lists)
		});
	}
}
