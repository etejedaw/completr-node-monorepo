import {
	ChangeDetectionStrategy,
	Component,
	inject,
	signal
} from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { AdminService } from "../admin.service";
import { User } from "../../../core/models";

@Component({
	selector: "app-admin-users",
	imports: [ReactiveFormsModule],
	templateUrl: "./admin-users.html",
	styleUrl: "./admin-users.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminUsers {
	private readonly fb = inject(FormBuilder);
	private readonly adminService = inject(AdminService);

	protected readonly createdUsers = signal<User[]>([]);
	protected readonly isSubmitting = signal(false);
	protected readonly errorMessage = signal("");
	protected readonly successMessage = signal("");

	form = this.fb.group({
		username: [
			"",
			[
				Validators.required,
				Validators.minLength(4),
				Validators.maxLength(15)
			]
		],
		email: ["", [Validators.required, Validators.email]],
		password: [
			"",
			[
				Validators.required,
				Validators.minLength(8),
				Validators.maxLength(15)
			]
		],
		name: [
			"",
			[
				Validators.required,
				Validators.minLength(4),
				Validators.maxLength(80)
			]
		]
	});

	onSubmit() {
		if (this.form.invalid || this.isSubmitting()) return;

		this.isSubmitting.set(true);
		this.errorMessage.set("");
		this.successMessage.set("");

		this.adminService
			.createUser(
				this.form.getRawValue() as {
					username: string;
					email: string;
					password: string;
					name: string;
				}
			)
			.subscribe({
				next: user => {
					this.createdUsers.update(list => [user, ...list]);
					this.successMessage.set(`User "${user.username}" created`);
					this.form.reset();
					this.isSubmitting.set(false);
				},
				error: err => {
					this.errorMessage.set(
						err.error?.detail ||
							err.error?.title ||
							"Failed to create user"
					);
					this.isSubmitting.set(false);
				}
			});
	}
}
