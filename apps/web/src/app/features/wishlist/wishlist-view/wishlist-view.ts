import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { WishlistEntry } from "../../../core/models";
import { WishlistService } from "../wishlist.service";
import { WishlistAddModal } from "../wishlist-add-modal/wishlist-add-modal";
import { UiButton, UiIconButton, UiSearchBar } from "../../../shared/ui";

@Component({
	selector: "app-wishlist-view",
	imports: [RouterLink, WishlistAddModal, UiButton, UiIconButton, UiSearchBar],
	templateUrl: "./wishlist-view.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class WishlistView implements OnInit {
	private readonly wishlistService = inject(WishlistService);

	protected readonly entries = signal<WishlistEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly showAddModal = signal(false);
	protected readonly viewMode = signal<"table" | "grid">("table");
	protected readonly searchQuery = signal("");

	protected readonly filteredEntries = computed(() => {
		const q = this.searchQuery().trim().toLowerCase();
		if (!q) return this.entries();
		return this.entries().filter(e =>
			e.backlog.game.title.toLowerCase().includes(q)
		);
	});

	ngOnInit() {
		this.loadWishlist();
	}

	openAddModal() {
		this.showAddModal.set(true);
	}

	onAddModalClosed() {
		this.showAddModal.set(false);
	}

	onAddModalSaved() {
		this.loadWishlist();
	}

	remove(entry: WishlistEntry) {
		const remaining = this.entries()
			.filter(e => e.id !== entry.id)
			.map(e => e.backlog.id);
		this.wishlistService.reorder(remaining).subscribe(updated => {
			this.entries.set(updated);
		});
	}

	moveUp(index: number) {
		if (index === 0) return;
		const list = [...this.entries()];
		[list[index - 1], list[index]] = [list[index], list[index - 1]];
		this.reorder(list);
	}

	moveDown(index: number) {
		if (index >= this.entries().length - 1) return;
		const list = [...this.entries()];
		[list[index], list[index + 1]] = [list[index + 1], list[index]];
		this.reorder(list);
	}

	statusLabel(status: string): string {
		const map: Record<string, string> = {
			not_started: "Not Started",
			playing: "Playing",
			completed: "Completed",
			abandoned: "Abandoned"
		};
		return map[status] ?? status;
	}

	statusClass(status: string): string {
		const map: Record<string, string> = {
			not_started: "bg-fg-muted/10 text-fg-muted",
			playing: "bg-warning/10 text-warning",
			completed: "bg-brand-subtle text-brand",
			abandoned: "bg-danger/10 text-danger"
		};
		return map[status] ?? "";
	}

	private loadWishlist() {
		this.isLoading.set(true);
		this.wishlistService.getMyWishlist().subscribe({
			next: entries => {
				this.entries.set(entries);
				this.isLoading.set(false);
			},
			error: () => this.isLoading.set(false)
		});
	}

	private reorder(list: WishlistEntry[]) {
		const backlogIds = list.map(e => e.backlog.id);
		this.wishlistService.reorder(backlogIds).subscribe(updated => {
			this.entries.set(updated);
		});
	}
}
