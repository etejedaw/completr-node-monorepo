import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { SavedFiltersService, SavedFilter } from "../saved-filters.service";
import { UiSearchBar } from "../../../shared/ui";

@Component({
	selector: "app-saved-filters-view",
	imports: [FormsModule, UiSearchBar],
	templateUrl: "./saved-filters-view.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SavedFiltersView implements OnInit {
	private readonly savedFiltersService = inject(SavedFiltersService);
	private readonly router = inject(Router);

	protected readonly filters = signal<SavedFilter[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly searchQuery = signal("");

	protected readonly filteredFilters = computed(() => {
		const q = this.searchQuery().trim().toLowerCase();
		if (!q) return this.filters();
		return this.filters().filter(
			f =>
				f.name.toLowerCase().includes(q) ||
				(f.description ?? "").toLowerCase().includes(q)
		);
	});

	// Edit modal
	protected readonly showModal = signal(false);
	protected readonly editingFilter = signal<SavedFilter | null>(null);
	protected readonly editName = signal("");
	protected readonly editDescription = signal("");
	protected readonly editShowInBacklog = signal(true);
	protected readonly editIsDefault = signal(false);
	protected readonly saving = signal(false);
	protected readonly showConfirmDelete = signal(false);
	protected readonly deleting = signal(false);

	ngOnInit() {
		this.loadFilters();
	}

	private loadFilters() {
		this.isLoading.set(true);
		this.savedFiltersService.getAll().subscribe({
			next: filters => {
				this.filters.set(
					filters.sort((a, b) => a.name.localeCompare(b.name))
				);
				this.isLoading.set(false);
			},
			error: () => this.isLoading.set(false)
		});
	}

	applyFilter(filter: SavedFilter) {
		this.router.navigate(["/backlog"], {
			queryParams: {
				savedFilterId: filter.id
			}
		});
	}

	openEdit(filter: SavedFilter, event: Event) {
		event.stopPropagation();
		this.editingFilter.set(filter);
		this.editName.set(filter.name);
		this.editDescription.set(filter.description ?? "");
		this.editShowInBacklog.set(filter.showInBacklog);
		this.editIsDefault.set(filter.isDefault);
		this.showConfirmDelete.set(false);
		this.showModal.set(true);
	}

	closeModal() {
		this.showModal.set(false);
		this.editingFilter.set(null);
	}

	saveEdit() {
		const filter = this.editingFilter();
		if (!filter) return;

		this.saving.set(true);
		this.savedFiltersService
			.update(filter.id, {
				name: this.editName(),
				description: this.editDescription() || undefined,
				showInBacklog: this.editShowInBacklog(),
				isDefault: this.editIsDefault()
			})
			.subscribe({
				next: () => {
					this.saving.set(false);
					this.showModal.set(false);
					this.editingFilter.set(null);
					this.loadFilters();
				},
				error: () => this.saving.set(false)
			});
	}

	deleteFilter() {
		const filter = this.editingFilter();
		if (!filter) return;

		this.deleting.set(true);
		this.savedFiltersService.delete(filter.id).subscribe({
			next: () => {
				this.deleting.set(false);
				this.showModal.set(false);
				this.editingFilter.set(null);
				this.loadFilters();
			},
			error: () => this.deleting.set(false)
		});
	}

	statusSummary(filter: SavedFilter): string {
		const f = filter.filters as Record<string, string>;
		const parts: string[] = [];
		if (f["status"]) parts.push(f["status"].replace(/,/g, ", "));
		if (f["platform_id"]) parts.push("platform");
		if (f["started_from"] || f["started_to"]) parts.push("started date");
		if (f["finished_from"] || f["finished_to"]) parts.push("finished date");
		if (f["min_rating"] || f["max_rating"]) parts.push("rating");
		return parts.join(" · ") || "No filters";
	}

	filterChips(
		filter: SavedFilter
	): { label: string; icon: string; classes: string }[] {
		const f = filter.filters as Record<string, string>;
		const chips: { label: string; icon: string; classes: string }[] = [];

		if (f["status"]) {
			for (const status of f["status"].split(",")) {
				chips.push({
					label: this.statusLabel(status),
					icon: this.statusIcon(status),
					classes: this.statusChipClass(status)
				});
			}
		}
		if (f["platform_id"]) {
			chips.push({
				label: "Platform",
				icon: "devices",
				classes: "bg-brand-subtle text-brand"
			});
		}
		if (f["started_from"] || f["started_to"]) {
			chips.push({
				label: "Started",
				icon: "play_arrow",
				classes: "bg-input-bg text-fg-secondary border border-line"
			});
		}
		if (f["finished_from"] || f["finished_to"]) {
			chips.push({
				label: "Finished",
				icon: "flag",
				classes: "bg-input-bg text-fg-secondary border border-line"
			});
		}
		if (f["min_rating"] || f["max_rating"]) {
			chips.push({
				label: "Rating",
				icon: "star",
				classes: "bg-warning/10 text-warning"
			});
		}
		if (filter.sortBy && filter.sortBy !== "createdAt") {
			const order = filter.sortOrder === "asc" ? "↑" : "↓";
			chips.push({
				label: `${filter.sortBy} ${order}`,
				icon: "sort",
				classes: "bg-input-bg text-fg-secondary border border-line"
			});
		}

		return chips;
	}

	private statusLabel(status: string): string {
		const map: Record<string, string> = {
			not_started: "Not Started",
			playing: "Playing",
			completed: "Completed",
			abandoned: "Abandoned"
		};
		return map[status] ?? status;
	}

	private statusIcon(status: string): string {
		const map: Record<string, string> = {
			not_started: "radio_button_unchecked",
			playing: "play_arrow",
			completed: "check_circle",
			abandoned: "cancel"
		};
		return map[status] ?? "circle";
	}

	private statusChipClass(status: string): string {
		const map: Record<string, string> = {
			not_started: "bg-fg-muted/10 text-fg-muted",
			playing: "bg-warning/10 text-warning",
			completed: "bg-success/10 text-success",
			abandoned: "bg-danger/10 text-danger"
		};
		return map[status] ?? "bg-input-bg text-fg-secondary";
	}
}
