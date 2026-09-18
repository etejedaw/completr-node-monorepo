import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { DialogService } from "../../../core/services/dialog";
import { ToastService } from "../../../core/services/toast";
import { Franchise, FranchisesService } from "../../franchises/franchises";
import { UiButton, UiIconButton } from "../../../shared/ui";
import {
	AdminFranchiseModal,
	AdminFranchiseModalData,
	AdminFranchiseModalResult
} from "../admin-franchise-modal/admin-franchise-modal";

@Component({
	selector: "app-admin-franchises",
	imports: [RouterLink, UiButton, UiIconButton],
	templateUrl: "./admin-franchises.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminFranchises implements OnInit {
	private readonly franchisesService = inject(FranchisesService);
	private readonly dialogs = inject(DialogService);
	private readonly toast = inject(ToastService);

	protected readonly franchises = signal<Franchise[]>([]);
	protected readonly isLoading = signal(true);

	ngOnInit() {
		this.load();
	}

	private load() {
		this.isLoading.set(true);
		this.franchisesService.getFranchises({ limit: 100 }).subscribe({
			next: data => {
				this.franchises.set(data.franchises);
				this.isLoading.set(false);
			},
			error: () => this.isLoading.set(false)
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
		>(AdminFranchiseModal, { data: { franchise } });
		ref.afterClosed.subscribe(result => {
			if (result === "saved") this.load();
		});
	}

	protected remove(f: Franchise) {
		if (
			!confirm(
				`Delete franchise "${f.name}"? Games will be unassigned but not deleted.`
			)
		)
			return;
		this.franchisesService.deleteFranchise(f.id).subscribe({
			next: () => {
				this.toast.success("Franchise deleted");
				this.load();
			},
			error: () => this.toast.error("Failed to delete franchise")
		});
	}
}
