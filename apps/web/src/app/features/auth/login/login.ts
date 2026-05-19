import {
	ChangeDetectionStrategy,
	Component,
	inject,
	signal
} from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../../core/services/auth.service";
import { UiButton, UiInput } from "../../../shared/ui";

@Component({
	selector: "app-login",
	imports: [ReactiveFormsModule, UiButton, UiInput],
	templateUrl: "./login.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Login {
	private readonly fb = inject(FormBuilder);
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);

	protected readonly isLoading = signal(false);
	protected readonly error = signal("");

	form = this.fb.group({
		email: ["", [Validators.required, Validators.email]],
		password: ["", [Validators.required, Validators.minLength(8)]]
	});

	onSubmit() {
		if (this.form.invalid) return;

		this.isLoading.set(true);
		this.error.set("");

		const { email, password } = this.form.getRawValue();
		this.auth.login({ email: email!, password: password! }).subscribe({
			next: () => {
				this.auth.loadUser().subscribe({
					next: () => this.router.navigate(["/backlog"]),
					error: () => this.router.navigate(["/backlog"])
				});
			},
			error: err => {
				this.isLoading.set(false);
				this.error.set(err.error?.title ?? "Login failed");
			}
		});
	}
}
