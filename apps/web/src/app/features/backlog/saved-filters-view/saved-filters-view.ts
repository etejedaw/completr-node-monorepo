import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { HttpErrorResponse } from "@angular/common/http";
import { Router, RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { SavedFiltersService, SavedFilter } from "../saved-filters";
import {
	SAVED_FILTER_COLORS,
	SAVED_FILTER_ICONS,
	savedFilterColorHex
} from "../saved-filter-appearance";
import { ToastService } from "../../../core/services/toast";
import { AuthService } from "../../../core/services/auth";
import {
	UiButton,
	UiEmptyState,
	UiPagination,
	UiSearchBar,
	UiSelect,
	UiTextarea
} from "../../../shared/ui";
import { Subject, debounceTime, distinctUntilChanged } from "rxjs";

type SortMode =
	| "name_asc"
	| "name_desc"
	| "created_desc"
	| "created_asc"
	| "pinned"
	| "default";

@Component({
	selector: "app-saved-filters-view",
	imports: [
		FormsModule,
		RouterLink,
		UiButton,
		UiEmptyState,
		UiPagination,
		UiSearchBar,
		UiSelect,
		UiTextarea
	],
	templateUrl: "./saved-filters-view.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SavedFiltersView implements OnInit {
	private readonly savedFiltersService = inject(SavedFiltersService);
	private readonly router = inject(Router);
	private readonly toast = inject(ToastService);
	private readonly authService = inject(AuthService);

	protected readonly filters = signal<SavedFilter[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly searchQuery = signal("");
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = 25;
	protected readonly frozen = signal(false);
	protected readonly sortMode = signal<SortMode>("name_asc");

	onOffsetChange(offset: number) {
		this.offset.set(offset);
		this.loadFilters();
	}

	protected readonly filteredFilters = computed(() => {
		const filters = [...this.filters()];
		const byName = (a: SavedFilter, b: SavedFilter) =>
			a.name.localeCompare(b.name);
		switch (this.sortMode()) {
			case "name_asc":
				return filters.sort(byName);
			case "name_desc":
				return filters.sort((a, b) => byName(b, a));
			case "created_desc":
				return filters.sort((a, b) =>
					b.createdAt.localeCompare(a.createdAt)
				);
			case "created_asc":
				return filters.sort((a, b) =>
					a.createdAt.localeCompare(b.createdAt)
				);
			case "pinned":
				return filters.sort(
					(a, b) =>
						Number(b.showInBacklog) - Number(a.showInBacklog) ||
						byName(a, b)
				);
			case "default":
				return filters.sort(
					(a, b) =>
						Number(b.isDefault) - Number(a.isDefault) ||
						byName(a, b)
				);
		}
	});

	private readonly searchSubject = new Subject<string>();

	onSearch(query: string) {
		this.searchQuery.set(query);
		this.searchSubject.next(query);
	}

	protected readonly showModal = signal(false);
	protected readonly editingFilter = signal<SavedFilter | null>(null);
	protected readonly editName = signal("");
	protected readonly editDescription = signal("");
	protected readonly editShowInBacklog = signal(true);
	protected readonly editIsDefault = signal(false);
	protected readonly editIcon = signal<string | null>(null);
	protected readonly editColor = signal<string | null>(null);
	protected readonly iconOptions = SAVED_FILTER_ICONS;
	protected readonly colorOptions = SAVED_FILTER_COLORS;
	protected readonly colorHex = savedFilterColorHex;
	protected readonly saving = signal(false);
	protected readonly showConfirmDelete = signal(false);
	protected readonly deleting = signal(false);
	protected readonly showDuplicateModal = signal(false);
	protected readonly duplicatingFilter = signal<SavedFilter | null>(null);
	protected readonly duplicateName = signal("");
	protected readonly duplicating = signal(false);

	ngOnInit() {
		this.searchSubject
			.pipe(debounceTime(300), distinctUntilChanged())
			.subscribe(() => {
				this.offset.set(0);
				this.loadFilters();
			});
		this.loadFilters();
	}

	private loadFilters() {
		this.isLoading.set(true);
		this.savedFiltersService
			.getPaged({
				limit: this.limit,
				offset: this.offset(),
				search: this.searchQuery().trim() || undefined
			})
			.subscribe({
				next: res => {
					this.filters.set(res.data.savedFilters);
					this.total.set(
						res.data.total ?? res.data.savedFilters.length
					);
					this.frozen.set(res.data.frozen ?? false);
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

	shareFilter(filter: SavedFilter, event: Event) {
		event.stopPropagation();
		const username = this.authService.user()?.username;
		if (!username) return;

		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(filter.filters))
			if (value != null && value !== "") params.set(key, String(value));
		if (filter.sortBy) params.set("sort_by", filter.sortBy);
		if (filter.sortOrder) params.set("sort_order", filter.sortOrder);
		params.set("view_name", filter.name);
		if (filter.description) params.set("view_desc", filter.description);

		const url = `${window.location.origin}/user/${username}/backlog?${params.toString()}`;
		navigator.clipboard.writeText(url).then(
			() => {
				const visibility = this.authService.user()?.backlogVisibility;
				if (visibility === "friends")
					this.toast.warning(
						"Link copied. Your backlog is friends-only, so only your friends (signed in) can open it."
					);
				else if (visibility === "private")
					this.toast.warning(
						"Link copied, but your backlog is private, so no one else can open it."
					);
				else this.toast.success("Backlog link copied to clipboard.");
			},
			() => this.toast.error("Couldn't copy the link.")
		);
	}

	openDuplicate(filter: SavedFilter, event: Event) {
		event.stopPropagation();
		this.duplicatingFilter.set(filter);
		this.duplicateName.set(`${filter.name} (copy)`);
		this.showDuplicateModal.set(true);
	}

	closeDuplicateModal() {
		this.showDuplicateModal.set(false);
		this.duplicatingFilter.set(null);
	}

	confirmDuplicate() {
		const filter = this.duplicatingFilter();
		const name = this.duplicateName().trim();
		if (!filter || !name) return;

		this.duplicating.set(true);
		this.savedFiltersService
			.create({
				name,
				description: filter.description ?? undefined,
				filters: filter.filters,
				sortBy: filter.sortBy ?? undefined,
				sortOrder: filter.sortOrder ?? undefined,
				showInBacklog: filter.showInBacklog,
				enabledStats: filter.enabledStats
			})
			.subscribe({
				next: () => {
					this.duplicating.set(false);
					this.showDuplicateModal.set(false);
					this.duplicatingFilter.set(null);
					this.loadFilters();
				},
				error: err => {
					this.duplicating.set(false);
					if (err instanceof HttpErrorResponse && err.status === 402)
						this.toast.error(
							"You've reached the free limit of 5 saved views. Delete one to duplicate."
						);
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
		this.editIcon.set(filter.icon);
		this.editColor.set(filter.color);
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
				isDefault: this.editIsDefault(),
				icon: this.editIcon(),
				color: this.editColor()
			})
			.subscribe({
				next: () => {
					this.saving.set(false);
					this.showModal.set(false);
					this.editingFilter.set(null);
					this.loadFilters();
				},
				error: err => {
					this.saving.set(false);
					if (err instanceof HttpErrorResponse && err.status === 402)
						this.toast.error(
							"Saved views are frozen. Delete views to go below the free limit of 5 before editing."
						);
				}
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
