import { HttpErrorResponse } from "@angular/common/http";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { debounceTime, distinctUntilChanged, Subject } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import { ToastService } from "../../../core/services/toast";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../../shared/components/library-toolbar/library-toolbar";
import { PremiumOnly } from "../../../shared/directives/premium-only";
import {
	UiBottomSheet,
	UiButton,
	UiEmptyState,
	UiPagination,
	UiPremiumBadge,
	UiSearchBar,
	UiSelect,
	UiSkeleton,
	UiTextarea
} from "../../../shared/ui";
import { injectLibraryPosters } from "../library-posters";
import {
	SAVED_FILTER_COLORS,
	SAVED_FILTER_ICONS,
	savedFilterColorHex
} from "../saved-filter-appearance";
import { type SavedFilter, SavedFiltersService } from "../saved-filters";
import { SavedViewCard } from "../saved-view-card/saved-view-card";

type SortMode =
	| "name_asc"
	| "name_desc"
	| "created_desc"
	| "created_asc"
	| "pinned"
	| "default";

function isFeatured(view: SavedFilter): boolean {
	return view.isDefault || view.showInBacklog;
}

type SheetActionId = "share" | "duplicate" | "edit";

const SHEET_ACTIONS: { id: SheetActionId; icon: string; label: string }[] = [
	{ id: "share", icon: "share", label: "Copy public link" },
	{ id: "duplicate", icon: "content_copy", label: "Duplicate" },
	{ id: "edit", icon: "edit", label: "Edit" }
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
	{ value: "name_asc", label: "Name (A–Z)" },
	{ value: "name_desc", label: "Name (Z–A)" },
	{ value: "created_desc", label: "Recently created" },
	{ value: "created_asc", label: "Oldest first" },
	{ value: "pinned", label: "Pinned first" },
	{ value: "default", label: "Default first" }
];

@Component({
	selector: "app-saved-filters-view",
	imports: [
		RouterLink,
		LibraryHero,
		LibraryToolbar,
		SavedViewCard,
		UiButton,
		UiEmptyState,
		UiPagination,
		UiPremiumBadge,
		UiSearchBar,
		UiSelect,
		UiSkeleton,
		UiBottomSheet,
		UiTextarea,
		PremiumOnly
	],
	templateUrl: "./saved-filters-view.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SavedFiltersView implements OnInit {
	private readonly savedFiltersService = inject(SavedFiltersService);
	private readonly toast = inject(ToastService);
	private readonly authService = inject(AuthService);

	protected readonly isPremium = this.authService.isPremium;
	protected readonly filters = signal<SavedFilter[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly searchQuery = signal("");
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = 100;
	protected readonly sortOptions = SORT_OPTIONS;
	protected readonly sheetActions = SHEET_ACTIONS;
	protected readonly actionSheetView = signal<SavedFilter | null>(null);

	protected readonly heroPosters = injectLibraryPosters();
	protected readonly skeletonRange = Array.from({ length: 6 }, (_, i) => i);
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

	protected readonly featuredViews = computed(() =>
		this.filteredFilters().filter(isFeatured)
	);
	protected readonly otherViews = computed(() =>
		this.filteredFilters().filter(view => !isFeatured(view))
	);

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

	runSheetAction(view: SavedFilter, id: SheetActionId) {
		this.actionSheetView.set(null);
		if (id === "share") this.shareFilter(view);
		else if (id === "duplicate") this.openDuplicate(view);
		else this.openEdit(view);
	}

	shareFilter(filter: SavedFilter) {
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

	openDuplicate(filter: SavedFilter) {
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

	openEdit(filter: SavedFilter) {
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
}
