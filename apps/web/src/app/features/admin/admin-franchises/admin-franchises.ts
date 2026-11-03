import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";

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
	protected readonly isLoading = signal(true);
	protected readonly loadError = signal(false);
	protected readonly skeletonRange = [0, 1, 2, 3];
	protected readonly franchiseToDelete = signal<Franchise | null>(null);
	protected readonly isDeleting = signal(false);
	protected readonly searchQuery = signal("");
	protected readonly rowMenuItems: ActionMenuItem[] = [
		{ id: "edit", label: "Edit franchise", icon: "edit" },
		{
			id: "delete",
			label: "Delete franchise",
			icon: "delete",
			iconClass: "text-danger"
		}
	];

	protected readonly hasFranchises = computed(
		() => !this.loadError() && this.franchises().length > 0
	);

	protected readonly visibleFranchises = computed(() => {
		const needle = this.searchQuery().trim().toLowerCase();
		if (!needle) return this.franchises();
		return this.franchises().filter(franchise =>
			franchise.name.toLowerCase().includes(needle)
		);
	});

	ngOnInit() {
		this.load();
	}

	protected reload() {
		this.load();
	}

	private load() {
		this.isLoading.set(true);
		this.loadError.set(false);
		this.franchisesService.getFranchises({ limit: 100 }).subscribe({
			next: data => {
				this.franchises.set(data.franchises);
				this.isLoading.set(false);
			},
			error: () => {
				this.loadError.set(true);
				this.isLoading.set(false);
			}
		});
	}

	protected clearSearch() {
		this.searchQuery.set("");
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
			if (result === "saved") this.load();
		});
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
