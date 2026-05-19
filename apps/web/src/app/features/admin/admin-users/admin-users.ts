import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AdminService, AdminUser } from "../admin.service";
import { UiButton, UiIconButton, UiInput } from "../../../shared/ui";

interface CreateUserRequest {
	username: string;
	email: string;
	password: string;
	name: string;
}

@Component({
	selector: "app-admin-users",
	imports: [DatePipe, FormsModule, UiButton, UiIconButton, UiInput],
	templateUrl: "./admin-users.html",
	styleUrl: "./admin-users.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminUsers implements OnInit {
	private readonly adminService = inject(AdminService);

	protected readonly Math = Math;
	protected readonly users = signal<AdminUser[]>([]);
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = 50;
	protected readonly isLoading = signal(true);

	// Create modal
	protected readonly showCreateModal = signal(false);
	protected readonly createUsername = signal("");
	protected readonly createEmail = signal("");
	protected readonly createPassword = signal("");
	protected readonly createName = signal("");
	protected readonly isCreating = signal(false);
	protected readonly createError = signal("");

	// Edit modal
	protected readonly showEditModal = signal(false);
	protected readonly editingUser = signal<AdminUser | null>(null);
	protected readonly editName = signal("");
	protected readonly editRole = signal("");
	protected readonly editPassword = signal("");
	protected readonly editIsActive = signal(true);
	protected readonly isEditing = signal(false);
	protected readonly editError = signal("");

	ngOnInit() {
		this.loadUsers();
	}

	loadUsers() {
		this.isLoading.set(true);
		this.adminService.listUsers(this.limit, this.offset()).subscribe({
			next: res => {
				this.users.set(res.users);
				this.total.set(res.total);
				this.isLoading.set(false);
			},
			error: () => this.isLoading.set(false)
		});
	}

	// === Create modal ===

	openCreate() {
		this.createUsername.set("");
		this.createEmail.set("");
		this.createPassword.set("");
		this.createName.set("");
		this.createError.set("");
		this.showCreateModal.set(true);
	}

	closeCreate() {
		this.showCreateModal.set(false);
	}

	submitCreate() {
		if (this.isCreating()) return;

		this.isCreating.set(true);
		this.createError.set("");

		const data: CreateUserRequest = {
			username: this.createUsername(),
			email: this.createEmail(),
			password: this.createPassword(),
			name: this.createName()
		};

		this.adminService.createUser(data).subscribe({
			next: () => {
				this.isCreating.set(false);
				this.closeCreate();
				this.offset.set(0);
				this.loadUsers();
			},
			error: err => {
				this.createError.set(
					err.error?.detail ||
						err.error?.title ||
						"Failed to create user"
				);
				this.isCreating.set(false);
			}
		});
	}

	// === Edit modal ===

	openEdit(user: AdminUser) {
		this.editingUser.set(user);
		this.editName.set(user.name);
		this.editRole.set(user.role);
		this.editPassword.set("");
		this.editIsActive.set(user.isActive);
		this.editError.set("");
		this.showEditModal.set(true);
	}

	closeEdit() {
		this.showEditModal.set(false);
		this.editingUser.set(null);
	}

	submitEdit() {
		const user = this.editingUser();
		if (!user || this.isEditing()) return;

		this.isEditing.set(true);
		this.editError.set("");

		const data: {
			name?: string;
			password?: string;
			role?: string;
			isActive?: boolean;
		} = {};
		if (this.editName() !== user.name) data.name = this.editName();
		if (this.editRole() !== user.role) data.role = this.editRole();
		if (this.editPassword()) data.password = this.editPassword();
		if (this.editIsActive() !== user.isActive)
			data.isActive = this.editIsActive();

		if (Object.keys(data).length === 0) {
			this.isEditing.set(false);
			this.closeEdit();
			return;
		}

		this.adminService.editUser(user.id, data).subscribe({
			next: updated => {
				this.users.update(list =>
					list.map(u => (u.id === updated.id ? updated : u))
				);
				this.isEditing.set(false);
				this.closeEdit();
			},
			error: err => {
				this.editError.set(
					err.error?.detail ||
						err.error?.title ||
						"Failed to update user"
				);
				this.isEditing.set(false);
			}
		});
	}

	// === Pagination ===

	nextPage() {
		this.offset.update(o => o + this.limit);
		this.loadUsers();
	}

	prevPage() {
		this.offset.update(o => Math.max(0, o - this.limit));
		this.loadUsers();
	}
}
