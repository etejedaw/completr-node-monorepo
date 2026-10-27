import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	effect,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { debounceTime, distinctUntilChanged, Subject } from "rxjs";

import { type PlatinumEntry } from "../../../core/models";
import { DialogService } from "../../../core/services/dialog";
import { type ExportParams } from "../../../core/services/export";
import { ToastService } from "../../../core/services/toast";
import { ExportActions } from "../../../shared/components/export-actions/export-actions";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import {
	LibraryPage,
	type LibraryPageState
} from "../../../shared/components/library-page/library-page";
import {
	LibraryPageContent,
	LibraryPageEmptyAction,
	LibraryPageToolbar
} from "../../../shared/components/library-page/library-page-slots";
import {
	countByPlatform,
	matchesPlatform,
	PlatformFilter
} from "../../../shared/components/platform-filter/platform-filter";
import { ViewModeToggle } from "../../../shared/components/view-mode-toggle/view-mode-toggle";
import { UiButton, UiSearchBar } from "../../../shared/ui";
import {
	PLATINUM_VIEW_MODES,
	PlatinumCollection,
	type PlatinumViewMode,
	readStoredPlatinumViewMode
} from "../components/platinum-collection/platinum-collection";
import { PlatinumService } from "../platinum";
import {
	PlatinumDialog,
	type PlatinumDialogData,
	type PlatinumDialogResult
} from "../platinum-dialog/platinum-dialog";

const VIEW_MODE_STORAGE_KEY = "completr.platinums.viewMode";

@Component({
	selector: "app-platinum-list",
	imports: [
		ExportActions,
		LibraryHero,
		LibraryPage,
		LibraryPageContent,
		LibraryPageEmptyAction,
		LibraryPageToolbar,
		PlatformFilter,
		PlatinumCollection,
		UiButton,
		UiSearchBar,
		ViewModeToggle
	],
	templateUrl: "./platinum-list.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlatinumList implements OnInit {
	private readonly platinumService = inject(PlatinumService);
	private readonly dialogs = inject(DialogService);
	private readonly toast = inject(ToastService);
	private readonly destroyRef = inject(DestroyRef);

	protected readonly viewModes = PLATINUM_VIEW_MODES;
	protected readonly viewMode = signal<PlatinumViewMode>(
		readStoredPlatinumViewMode(VIEW_MODE_STORAGE_KEY)
	);
	protected readonly allPlatinums = signal<PlatinumEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly searchQuery = signal("");
	protected readonly selectedPlatform = signal("");
	protected readonly exportParams = computed<ExportParams>(() => ({
		search: this.searchQuery().trim() || undefined,
		platform: this.selectedPlatform() || undefined
	}));
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = 100;

	protected readonly platformCounts = computed(() =>
		countByPlatform(this.allPlatinums(), platinum => platinum.platform)
	);
	protected readonly platinums = computed(() =>
		this.allPlatinums().filter(platinum =>
			matchesPlatform(platinum.platform, this.selectedPlatform())
		)
	);
	protected readonly pageState = computed<LibraryPageState>(() => {
		if (this.isLoading()) return "loading";
		if (this.platinums().length > 0) return "ready";
		return this.searchQuery().trim() || this.selectedPlatform()
			? "no-matches"
			: "empty";
	});
	protected readonly heroPosters = computed(() =>
		this.allPlatinums().map(platinum => ({
			src: platinum.game.backgroundUrl,
			title: platinum.game.title
		}))
	);

	private readonly searchSubject = new Subject<string>();

	constructor() {
		effect(() =>
			localStorage.setItem(VIEW_MODE_STORAGE_KEY, this.viewMode())
		);
	}

	ngOnInit() {
		this.searchSubject
			.pipe(
				debounceTime(300),
				distinctUntilChanged(),
				takeUntilDestroyed(this.destroyRef)
			)
			.subscribe(() => {
				this.offset.set(0);
				this.loadPlatinums();
			});
		this.loadPlatinums();
	}

	onSearch(query: string) {
		this.searchQuery.set(query);
		if (!query.trim()) {
			this.offset.set(0);
			this.loadPlatinums();
			return;
		}
		this.searchSubject.next(query);
	}

	clearSearchAndFilter() {
		this.searchQuery.set("");
		this.selectedPlatform.set("");
		this.offset.set(0);
		this.loadPlatinums();
	}

	onOffsetChange(offset: number) {
		this.offset.set(offset);
		this.loadPlatinums();
	}

	openAdd() {
		this.openDialog({});
	}

	openEdit(platinum: PlatinumEntry) {
		this.openDialog({
			game: { id: platinum.game.id, code: platinum.game.code }
		});
	}

	private openDialog(data: PlatinumDialogData) {
		const ref = this.dialogs.open<PlatinumDialogData, PlatinumDialogResult>(
			PlatinumDialog,
			{ data }
		);
		ref.afterClosed.subscribe(result => {
			if (!result) return;
			this.toast.success(
				result === "removed" ? "Platinum removed" : "Platinum saved"
			);
			this.loadPlatinums();
		});
	}

	private loadPlatinums() {
		this.isLoading.set(true);
		this.platinumService
			.getMine({
				limit: this.limit,
				offset: this.offset(),
				search: this.searchQuery().trim() || undefined
			})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: res => {
					this.allPlatinums.set(res.data.platinums);
					this.total.set(res.data.total);
					this.isLoading.set(false);
				},
				error: () => this.isLoading.set(false)
			});
	}
}
