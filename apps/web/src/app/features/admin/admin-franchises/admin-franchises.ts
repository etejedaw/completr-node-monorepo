import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import { debounceTime, Subject, type Subscription } from "rxjs";

import { DialogService } from "../../../core/services/dialog";
import { ToastService } from "../../../core/services/toast";
import { ActionMenu } from "../../../shared/components/action-menu/action-menu";
import { type ActionMenuItem } from "../../../shared/components/action-menu/action-menu.model";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../../shared/components/library-toolbar/library-toolbar";
import {
	UiAlert,
	UiButton,
	UiDialog,
	UiEmptyState,
	UiIconButton,
	UiNoMatches,
	UiPagination,
	UiSearchBar,
	UiSkeleton
} from "../../../shared/ui";
import { FranchisesService } from "../../franchises/franchises";
import { type Franchise } from "../../franchises/franchises.model";
import {
	AdminFranchiseModal,
	type AdminFranchiseModalResult
} from "../admin-franchise-modal/admin-franchise-modal";
import { type AdminFranchiseModalData } from "../admin-franchise-modal/admin-franchise-modal.model";

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MAX_LENGTH = 100;
const PAGE_SIZE = 50;

@Component({
	selector: "app-admin-franchises",
	imports: [
		RouterLink,
		ActionMenu,
		LibraryHero,
		LibraryToolbar,
		UiAlert,
		UiButton,
		UiDialog,
		UiEmptyState,
		UiIconButton,
		UiNoMatches,
		UiPagination,
		UiSearchBar,
		UiSkeleton
	],
	templateUrl: "./admin-franchises.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminFranchises implements OnInit {
	private readonly franchisesService = inject(FranchisesService);
	private readonly dialogs = inject(DialogService);
	private readonly toast = inject(ToastService);

	protected readonly franchises = signal<Franchise[]>([]);
	protected readonly total = signal(0);
	protected readonly catalogTotal = signal<number | null>(null);
	protected readonly isLoading = signal(true);
	protected readonly loadError = signal(false);
	protected readonly skeletonRange = [0, 1, 2, 3];
	protected readonly franchiseToDelete = signal<Franchise | null>(null);
	protected readonly isDeleting = signal(false);
	protected readonly query = signal("");
	protected readonly search = signal("");
	protected readonly offset = signal(0);
	protected readonly limit = PAGE_SIZE;
	protected readonly rowMenuItems: ActionMenuItem[] = [
		{ id: "edit", label: "Edit franchise", icon: "edit" },
		{
			id: "delete",
			label: "Delete franchise",
			icon: "delete",
			iconClass: "text-danger"
		}
	];

	private readonly searchChanges = new Subject<string>();
	private listSubscription: Subscription | null = null;

	protected readonly hasCatalog = computed(
		() => (this.catalogTotal() ?? 0) > 0
	);

	protected readonly isCatalogEmpty = computed(
		() => !this.search() && this.catalogTotal() === 0
	);

	constructor() {
		this.searchChanges
			.pipe(debounceTime(SEARCH_DEBOUNCE_MS), takeUntilDestroyed())
			.subscribe(search => this.applySearch(search));
		inject(DestroyRef).onDestroy(() =>
			this.listSubscription?.unsubscribe()
		);
	}

	ngOnInit() {
		this.load();
	}

	protected reload() {
		this.load();
	}

	protected onSearch(value: string) {
		this.query.set(value);
		const search = normalizeSearch(value);
		this.searchChanges.next(search);
		if (!search) this.applySearch(search);
	}

	protected clearSearch() {
		this.onSearch("");
	}

	protected goToOffset(offset: number) {
		this.offset.set(offset);
		this.load();
	}

	private applySearch(search: string) {
		if (search === this.search()) return;
		this.search.set(search);
		this.offset.set(0);
		this.load();
	}

	private load() {
		this.listSubscription?.unsubscribe();
		this.isLoading.set(true);
		this.loadError.set(false);
		const search = this.search();
		const offset = this.offset();
		this.listSubscription = this.franchisesService
			.getFranchises({
				search: search || undefined,
				limit: this.limit,
				offset
			})
			.subscribe({
				next: page => {
					const fallbackOffset = lastPageOffset(
						page.total,
						this.limit
					);
					if (
						page.franchises.length === 0 &&
						fallbackOffset < offset
					) {
						this.offset.set(fallbackOffset);
						this.load();
						return;
					}
					this.franchises.set(page.franchises);
					this.total.set(page.total);
					if (!search) this.catalogTotal.set(page.total);
					this.isLoading.set(false);
				},
				error: () => {
					this.loadError.set(true);
					this.isLoading.set(false);
				}
			});
	}

	protected runRowAction(franchise: Franchise, action: string) {
		if (action === "edit") this.openEdit(franchise);
		if (action === "delete") this.askRemove(franchise);
	}

	protected openCreate() {
		this.openModal(null);
	}

	protected openEdit(franchise: Franchise) {
		this.openModal(franchise);
	}

	private openModal(franchise: Franchise | null) {
		const ref = this.dialogs.open<
			AdminFranchiseModalData,
			AdminFranchiseModalResult
		>(AdminFranchiseModal, { data: { franchise }, closeOnEscape: false });
		ref.afterClosed.subscribe(result => {
			if (result !== "saved") return;
			if (!franchise) this.adjustCatalogTotal(1);
			this.load();
		});
	}

	private adjustCatalogTotal(change: number) {
		this.catalogTotal.update(total =>
			total === null ? total : Math.max(0, total + change)
		);
	}

	protected askRemove(franchise: Franchise) {
		this.franchiseToDelete.set(franchise);
	}

	protected cancelRemove() {
		if (this.isDeleting()) return;
		this.franchiseToDelete.set(null);
	}

	protected confirmRemove(franchise: Franchise) {
		if (this.isDeleting()) return;
		this.isDeleting.set(true);
		this.franchisesService.deleteFranchise(franchise.id).subscribe({
			next: () => {
				this.isDeleting.set(false);
				this.franchiseToDelete.set(null);
				this.toast.success("Franchise deleted");
				this.adjustCatalogTotal(-1);
				this.load();
			},
			error: (err: { status?: number }) => {
				this.isDeleting.set(false);
				this.franchiseToDelete.set(null);
				this.toast.error("Failed to delete franchise");
				if (err.status === 404) this.load();
			}
		});
	}
}

function normalizeSearch(value: string): string {
	return value.trim().slice(0, SEARCH_MAX_LENGTH).trim();
}

function lastPageOffset(total: number, limit: number): number {
	return Math.max(0, Math.ceil(total / limit) - 1) * limit;
}
