import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { debounceTime, distinctUntilChanged, Subject } from "rxjs";

import { type BacklogEntry } from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { PointerService } from "../../../core/services/pointer";
import { BacklogEntryCard } from "../../../shared/components/backlog-entry-card/backlog-entry-card";
import { BacklogStatusPills } from "../../../shared/components/backlog-status-pills/backlog-status-pills";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { OptionPicker } from "../../../shared/components/option-picker/option-picker";
import { ViewModeToggle } from "../../../shared/components/view-mode-toggle/view-mode-toggle";
import { type ViewModeOption } from "../../../shared/components/view-mode-toggle/view-mode-toggle.model";
import {
	UiButton,
	UiPagination,
	UiPlainEmptyState,
	UiSearchBar,
	UiSkeleton
} from "../../../shared/ui";
import {
	BACKLOG_STATUS_FILTERS,
	BACKLOG_STATUS_PICKER_OPTIONS
} from "../../../shared/utils/backlog-status";
import { BacklogTable } from "../../backlog/components/backlog-table/backlog-table";
import {
	type ProfileAccessError,
	ProfileAccessState
} from "../components/profile-access-state";
import { PublicLibraryService } from "../services/public-library.service";

const PAGE_SIZE = 50;

const SHAREABLE_FILTER_KEYS = [
	"platform_id",
	"platforms",
	"genres",
	"release_year_from",
	"release_year_to",
	"started_from",
	"started_to",
	"finished_from",
	"finished_to",
	"min_rating",
	"max_rating",
	"min_real_duration",
	"max_real_duration",
	"min_ratio",
	"max_ratio",
	"min_personal_ratio",
	"max_personal_ratio",
	"mood_tags"
];

type PublicBacklogViewMode = "diary" | "hardcore";
type SortOrder = "asc" | "desc";

const VIEW_MODE_STORAGE_KEY = "completr.publicBacklog.viewMode";

const PUBLIC_BACKLOG_VIEW_MODES: readonly ViewModeOption<PublicBacklogViewMode>[] =
	[
		{
			value: "diary",
			label: "Diary",
			icon: "view_agenda",
			title: "Diary view"
		},
		{
			value: "hardcore",
			label: "Hardcore",
			icon: "table_rows",
			title: "Hardcore (table) view"
		}
	];

function readStoredViewMode(): PublicBacklogViewMode {
	return localStorage.getItem(VIEW_MODE_STORAGE_KEY) === "hardcore"
		? "hardcore"
		: "diary";
}

function defaultSortForStatus(status: string): {
	sortBy: string;
	sortOrder: SortOrder;
} {
	switch (status) {
		case "playing":
		case "endless":
			return { sortBy: "startedAt", sortOrder: "desc" };
		case "completed":
		case "abandoned":
			return { sortBy: "finishedAt", sortOrder: "desc" };
		default:
			return { sortBy: "createdAt", sortOrder: "desc" };
	}
}

@Component({
	selector: "app-user-backlog",
	imports: [
		BacklogTable,
		ViewModeToggle,
		OptionPicker,
		RouterLink,
		BacklogEntryCard,
		BacklogStatusPills,
		LibraryHero,
		ProfileAccessState,
		UiButton,
		UiPagination,
		UiPlainEmptyState,
		UiSearchBar,
		UiSkeleton
	],
	templateUrl: "./user-backlog.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserBacklog implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly libraryService = inject(PublicLibraryService);
	private readonly authService = inject(AuthService);

	protected readonly username = signal("");
	protected readonly entries = signal<BacklogEntry[]>([]);
	protected readonly total = signal(0);
	protected readonly searchQuery = signal("");
	protected readonly offset = signal(0);
	protected readonly isLoading = signal(true);
	protected readonly error = signal<ProfileAccessError | null>(null);
	protected readonly pointer = inject(PointerService);
	protected readonly activeStatus = signal("");
	protected readonly limit = PAGE_SIZE;
	protected readonly skeletonRange = [0, 1, 2, 3, 4, 5];
	protected readonly flippedEntryIds = signal<Set<string>>(new Set());
	protected readonly heroPosters = computed(() =>
		this.entries().map(entry => ({
			src: entry.game.backgroundUrl,
			title: entry.game.title
		}))
	);

	private readonly sharedFilters = signal<Record<string, string>>({});
	private readonly explicitSortBy = signal("");
	private readonly explicitSortOrder = signal<SortOrder>("desc");
	protected readonly effectiveSort = computed(() =>
		this.explicitSortBy()
			? {
					sortBy: this.explicitSortBy(),
					sortOrder: this.explicitSortOrder()
				}
			: defaultSortForStatus(this.activeStatus())
	);
	protected readonly viewModes = PUBLIC_BACKLOG_VIEW_MODES;
	protected readonly viewMode =
		signal<PublicBacklogViewMode>(readStoredViewMode());
	protected readonly viewName = signal("");
	protected readonly viewDescription = signal("");

	private readonly searchSubject = new Subject<string>();

	protected readonly statusPickerOptions = BACKLOG_STATUS_PICKER_OPTIONS;
	protected readonly selectedStatuses = computed(() =>
		this.activeStatus() ? [this.activeStatus()] : []
	);

	protected readonly activeStatusLabel = computed(
		() =>
			BACKLOG_STATUS_FILTERS.find(
				filter => filter.value === this.activeStatus()
			)?.label ?? ""
	);

	protected readonly emptyMessage = computed(() => {
		if (this.searchQuery())
			return `No games match "${this.searchQuery()}".`;
		if (this.activeStatus()) {
			return `No ${this.activeStatusLabel().toLowerCase()} games to show.`;
		}
		return "This library has no public games yet.";
	});

	protected isFlipped(entryId: string): boolean {
		return this.flippedEntryIds().has(entryId);
	}

	protected toggleFlip(entryId: string, event: Event) {
		event.stopPropagation();
		const next = new Set(this.flippedEntryIds());
		if (next.has(entryId)) next.delete(entryId);
		else next.add(entryId);
		this.flippedEntryIds.set(next);
	}

	protected resetFilters() {
		this.searchQuery.set("");
		this.filterByStatus("");
	}

	ngOnInit() {
		this.searchSubject
			.pipe(debounceTime(300), distinctUntilChanged())
			.subscribe(query => {
				this.searchQuery.set(query);
				this.offset.set(0);
				this.load();
			});

		if (this.authService.token() && !this.authService.user()) {
			this.authService.loadUser().subscribe({
				next: () => this.init(),
				error: () => this.init()
			});
		} else {
			this.init();
		}
	}

	private init() {
		const qp = this.route.snapshot.queryParamMap;
		this.username.set(this.route.snapshot.paramMap.get("username") ?? "");
		this.activeStatus.set(qp.get("status") ?? "");

		const shared: Record<string, string> = {};
		for (const key of SHAREABLE_FILTER_KEYS) {
			const value = qp.get(key);
			if (value) shared[key] = value;
		}
		this.sharedFilters.set(shared);
		this.explicitSortBy.set(qp.get("sort_by") ?? "");
		this.explicitSortOrder.set(
			qp.get("sort_order") === "asc" ? "asc" : "desc"
		);
		this.viewName.set(qp.get("view_name") ?? "");
		this.viewDescription.set(qp.get("view_desc") ?? "");

		this.load();
	}

	onSearch(query: string) {
		this.searchSubject.next(query);
	}

	filterByStatus(status: string) {
		this.activeStatus.set(status);
		this.offset.set(0);
		this.load();
	}

	goToOffset(offset: number) {
		this.offset.set(offset);
		this.load();
	}

	protected setViewMode(mode: PublicBacklogViewMode) {
		this.viewMode.set(mode);
		localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
	}

	protected sortByColumn(column: string) {
		const { sortBy, sortOrder } = this.effectiveSort();
		this.explicitSortOrder.set(
			sortBy === column && sortOrder === "desc" ? "asc" : "desc"
		);
		this.explicitSortBy.set(column);
		this.offset.set(0);
		this.load();
	}

	private load() {
		this.isLoading.set(true);
		this.error.set(null);

		const sort = this.effectiveSort();
		const filters: Record<string, string | number> = {
			limit: this.limit,
			offset: this.offset(),
			sort_by: sort.sortBy,
			sort_order: sort.sortOrder,
			...this.sharedFilters()
		};
		if (this.activeStatus()) filters["status"] = this.activeStatus();
		if (this.searchQuery()) filters["search"] = this.searchQuery();

		this.libraryService.getUserBacklog(this.username(), filters).subscribe({
			next: result => {
				this.entries.set(result.items);
				this.total.set(result.total);
				this.isLoading.set(false);
			},
			error: err => {
				if (err.status === 403) this.error.set("private");
				else if (err.status === 404) this.error.set("not_found");
				this.isLoading.set(false);
			}
		});
	}
}
