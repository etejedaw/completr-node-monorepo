import {
	ChangeDetectionStrategy,
	Component,
	inject,
	signal
} from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../../../core/services/auth.service";
import { UiButton, UiInput } from "../../../shared/ui";

@Component({
	selector: "app-register",
	imports: [ReactiveFormsModule, RouterLink, UiButton, UiInput],
	templateUrl: "./register.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Register {
	private readonly fb = inject(FormBuilder);
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);

	protected readonly isLoading = signal(false);
	protected readonly error = signal("");

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
		name: [
			"",
			[
				Validators.required,
				Validators.minLength(4),
				Validators.maxLength(80)
			]
		],
		password: [
			"",
			[
				Validators.required,
				Validators.minLength(8),
				Validators.maxLength(15)
			]
		]
	});

	onSubmit() {
		if (this.form.invalid) return;

		this.isLoading.set(true);
		this.error.set("");

		const { username, email, name, password } = this.form.getRawValue();
		this.auth
			.register({
				username: username!,
				email: email!,
				name: name!,
				password: password!
			})
			.subscribe({
				next: () => {
					this.auth.loadUser().subscribe({
						next: () => this.router.navigate(["/backlog"]),
						error: () => this.router.navigate(["/backlog"])
					});
				},
				error: err => {
					this.isLoading.set(false);
					this.error.set(err.error?.title ?? "Registration failed");
				}
			});
	}
}
