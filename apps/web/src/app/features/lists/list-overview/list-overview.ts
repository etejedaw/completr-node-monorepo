import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { List } from "../../../core/models";
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

	protected readonly lists = signal<List[]>([]);
	protected readonly frozen = signal(false);
	protected readonly isLoading = signal(true);
	protected readonly showModal = signal(false);
	protected readonly editingList = signal<List | null>(null);

	ngOnInit() {
		this.loadLists();
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
}
