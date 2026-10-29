import {
	ChangeDetectionStrategy,
	Component,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { DialogService } from "../../../core/services/dialog";
import { ToastService } from "../../../core/services/toast";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import {
	UiAlert,
	UiButton,
	UiDialog,
	UiEmptyState,
	UiIconButton,
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
		LibraryHero,
		UiAlert,
		UiButton,
		UiDialog,
		UiEmptyState,
		UiIconButton,
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
