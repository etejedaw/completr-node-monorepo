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
import { UiButton, UiInput } from "../../../shared/ui";

interface PlatformCount {
	id: string;
	abbreviation: string;
	count: number;
}

@Component({
	selector: "app-game-shelf-list",
	imports: [DatePipe, GameShelfModal, RouterLink, UiButton, UiInput],
	templateUrl: "./game-shelf-list.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameShelfList implements OnInit {
	private readonly shelfService = inject(GameShelfService);

	protected readonly allEntries = signal<GameShelfEntry[]>([]);
	protected readonly entries = signal<GameShelfEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly searchQuery = signal("");
	protected readonly selectedPlatform = signal("");
	protected readonly platformCounts = signal<PlatformCount[]>([]);
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

	filterByPlatform(platformId: string) {
		this.selectedPlatform.set(platformId);
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
				this.buildPlatformCounts(entries);
				this.filterEntries();
				this.isLoading.set(false);
			},
			error: () => this.isLoading.set(false)
		});
	}

	private buildPlatformCounts(entries: GameShelfEntry[]) {
		const map = new Map<string, PlatformCount>();
		for (const e of entries) {
			const existing = map.get(e.platform.id);
			if (existing) {
				existing.count++;
			} else {
				map.set(e.platform.id, {
					id: e.platform.id,
					abbreviation: e.platform.abbreviation,
					count: 1
				});
			}
		}
		const sorted = [...map.values()].sort((a, b) => b.count - a.count);
		this.platformCounts.set(sorted);
	}

	private filterEntries() {
		let filtered = this.allEntries();

		const platform = this.selectedPlatform();
		if (platform) {
			filtered = filtered.filter(e => e.platform.id === platform);
		}

		const query = this.searchQuery().toLowerCase();
		if (query) {
			filtered = filtered.filter(e =>
				e.game.title.toLowerCase().includes(query)
			);
		}

		this.entries.set(filtered);
	}
}
