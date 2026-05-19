import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { WishlistEntry } from "../../../core/models";
import { WishlistService } from "../wishlist.service";
import { WishlistAddModal } from "../wishlist-add-modal/wishlist-add-modal";
import { UiButton, UiIconButton } from "../../../shared/ui";

@Component({
	selector: "app-wishlist-view",
	imports: [RouterLink, WishlistAddModal, UiButton, UiIconButton],
	templateUrl: "./wishlist-view.html",
	styleUrl: "./wishlist-view.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class WishlistView implements OnInit {
	private readonly wishlistService = inject(WishlistService);

	protected readonly entries = signal<WishlistEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly showAddModal = signal(false);
	protected readonly viewMode = signal<"table" | "grid">("table");

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
			not_started: "status-not-started",
			playing: "status-playing",
			completed: "status-completed",
			abandoned: "status-abandoned"
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
