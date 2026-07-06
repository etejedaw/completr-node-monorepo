import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { ToastService } from "../../../core/services/toast";
import { Franchise, FranchisesService } from "../../franchises/franchises";

@Component({
	selector: "app-admin-franchises",
	imports: [RouterLink],
	templateUrl: "./admin-franchises.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminFranchises implements OnInit {
	private readonly franchisesService = inject(FranchisesService);
	private readonly toast = inject(ToastService);

	protected readonly franchises = signal<Franchise[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly saving = signal(false);

	protected readonly newName = signal("");
	protected readonly newDescription = signal("");

	protected readonly editingId = signal<string | null>(null);
	protected readonly editName = signal("");
	protected readonly editDescription = signal("");

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

	protected create() {
		const name = this.newName().trim();
		if (!name || this.saving()) return;
		this.saving.set(true);
		this.franchisesService
			.createFranchise({
				name,
				description: this.newDescription().trim() || null
			})
			.subscribe({
				next: () => {
					this.newName.set("");
					this.newDescription.set("");
					this.saving.set(false);
					this.toast.success("Franchise created");
					this.load();
				},
				error: err => {
					this.saving.set(false);
					this.toast.error(
						err?.status === 409
							? "A franchise with that name already exists"
							: "Failed to create franchise"
					);
				}
			});
	}

	protected startEdit(f: Franchise) {
		this.editingId.set(f.id);
		this.editName.set(f.name);
		this.editDescription.set(f.description ?? "");
	}

	protected cancelEdit() {
		this.editingId.set(null);
	}

	protected saveEdit(f: Franchise) {
		const name = this.editName().trim();
		if (!name || this.saving()) return;
		this.saving.set(true);
		this.franchisesService
			.updateFranchise(f.id, {
				name,
				description: this.editDescription().trim() || null
			})
			.subscribe({
				next: () => {
					this.saving.set(false);
					this.editingId.set(null);
					this.toast.success("Franchise updated");
					this.load();
				},
				error: () => {
					this.saving.set(false);
					this.toast.error("Failed to update franchise");
				}
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
