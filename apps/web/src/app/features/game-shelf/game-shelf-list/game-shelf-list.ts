import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { GameShelfEntry } from "../../../core/models";
import { GameShelfService } from "../game-shelf.service";
import { RouterLink } from "@angular/router";
import { GameShelfModal } from "../game-shelf-modal/game-shelf-modal";

@Component({
	selector: "app-game-shelf-list",
	imports: [DatePipe, GameShelfModal, RouterLink],
	templateUrl: "./game-shelf-list.html",
	styleUrl: "./game-shelf-list.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameShelfList implements OnInit {
	private readonly shelfService = inject(GameShelfService);

	private readonly allEntries = signal<GameShelfEntry[]>([]);
	protected readonly entries = signal<GameShelfEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly searchQuery = signal("");
	protected readonly showModal = signal(false);
	protected readonly editingEntry = signal<GameShelfEntry | null>(null);

	ngOnInit() {
		this.loadShelf();
	}

	onSearch(event: Event) {
		const query = (event.target as HTMLInputElement).value;
		this.searchQuery.set(query);
		this.filterEntries();
	}

	openCreate() {
		this.editingEntry.set(null);
		this.showModal.set(true);
	}

	openEdit(entry: GameShelfEntry) {
		this.editingEntry.set(entry);
		this.showModal.set(true);
	}

	onModalClosed() {
		this.showModal.set(false);
		this.editingEntry.set(null);
	}

	onModalSaved() {
		this.showModal.set(false);
		this.editingEntry.set(null);
		this.loadShelf();
	}

	private loadShelf() {
		this.isLoading.set(true);
		this.shelfService.getMyShelf().subscribe({
			next: entries => {
				this.allEntries.set(entries);
				this.filterEntries();
				this.isLoading.set(false);
			},
			error: () => this.isLoading.set(false)
		});
	}

	private filterEntries() {
		const query = this.searchQuery().toLowerCase();
		if (!query) {
			this.entries.set(this.allEntries());
			return;
		}
		const filtered = this.allEntries().filter(e =>
			e.game.title.toLowerCase().includes(query)
		);
		this.entries.set(filtered);
	}
}
