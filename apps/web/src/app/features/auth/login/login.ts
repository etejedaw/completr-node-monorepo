import {
	ChangeDetectionStrategy,
	Component,
	inject,
	signal
} from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { AuthService } from "../../../core/services/auth";
import { UiButton, UiInput } from "../../../shared/ui";

@Component({
	selector: "app-login",
	imports: [ReactiveFormsModule, UiButton, UiInput, RouterLink],
	templateUrl: "./login.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Login {
	private readonly fb = inject(FormBuilder);
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);
	private readonly route = inject(ActivatedRoute);

	protected readonly isLoading = signal(false);
	protected readonly error = signal("");
	protected readonly showPassword = signal(false);

	toggleShowPassword() {
		this.showPassword.update(v => !v);
	}

	form = this.fb.group({
		email: ["", [Validators.required]],
		password: ["", [Validators.required]]
	});

	onSubmit() {
		if (this.form.invalid) return;

		this.isLoading.set(true);
		this.error.set("");

		const { email, password } = this.form.getRawValue();
		this.auth.login({ email: email!, password: password! }).subscribe({
			next: () => {
				const target = this.resolveReturnUrl();
				this.auth.loadUser().subscribe({
					next: () => this.router.navigateByUrl(target),
					error: () => this.router.navigateByUrl(target)
				});
			},
			error: err => {
				this.isLoading.set(false);
				this.error.set(this.messageFor(err));
			}
		});
	}

	private resolveReturnUrl(): string {
		const raw = this.route.snapshot.queryParamMap.get("returnUrl");
		if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
			return raw;
		}
		return "/backlog";
	}

	private messageFor(err: { status?: number }): string {
		if (err.status === 400 || err.status === 401 || err.status === 422) {
			return "Invalid email or password.";
		}
		return "Login failed. Please try again.";
	}
}
