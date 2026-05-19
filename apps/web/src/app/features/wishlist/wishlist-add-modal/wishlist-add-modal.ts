import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	output,
	signal
} from "@angular/core";
import { BacklogEntry } from "../../../core/models";
import { BacklogService } from "../../backlog/backlog.service";
import { WishlistService } from "../wishlist.service";
import { UiButton, UiIconButton } from "../../../shared/ui";

@Component({
	selector: "app-wishlist-add-modal",
	imports: [UiButton, UiIconButton],
	templateUrl: "./wishlist-add-modal.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class WishlistAddModal implements OnInit {
	private readonly backlogService = inject(BacklogService);
	private readonly wishlistService = inject(WishlistService);

	closed = output<void>();
	saved = output<void>();

	protected readonly entries = signal<BacklogEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly adding = signal<string | null>(null);
	protected readonly searchQuery = signal("");

	ngOnInit() {
		this.backlogService
			.getMyBacklog({ status: "not_started,playing" })
			.subscribe({
				next: res => {
					this.entries.set(res.data.backlog);
					this.isLoading.set(false);
				},
				error: () => this.isLoading.set(false)
			});
	}

	protected filteredEntries() {
		const query = this.searchQuery().toLowerCase();
		if (!query) return this.entries();
		return this.entries().filter(e =>
			e.game.title.toLowerCase().includes(query)
		);
	}

	onSearch(event: Event) {
		this.searchQuery.set((event.target as HTMLInputElement).value);
	}

	addToWishlist(entry: BacklogEntry) {
		if (this.adding()) return;
		this.adding.set(entry.id);
		this.wishlistService.addFromBacklog(entry.id).subscribe({
			next: () => {
				this.adding.set(null);
				this.entries.set(this.entries().filter(e => e.id !== entry.id));
				this.saved.emit();
			},
			error: () => this.adding.set(null)
		});
	}

	onClose() {
		this.closed.emit();
	}
}
