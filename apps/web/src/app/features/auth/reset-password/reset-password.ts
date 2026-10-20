import {
	ChangeDetectionStrategy,
	Component,
	inject,
	signal
} from "@angular/core";
import { form, FormField, maxLength, validate } from "@angular/forms/signals";
import { ActivatedRoute, RouterLink } from "@angular/router";

import { AuthService } from "../../../core/services/auth";
import {
	failedPasswordRules,
	PASSWORD_MAX_LENGTH
} from "../../../core/utils/password-policy";
import { PasswordRules } from "../../../shared/components/password-rules/password-rules";
import { UiAlert, UiButton, UiIconButton, UiInput } from "../../../shared/ui";
import { AuthPage } from "../auth-page/auth-page";

type ResetStatus = "editing" | "done" | "invalidLink";

@Component({
	selector: "app-reset-password",
	imports: [
		AuthPage,
		FormField,
		PasswordRules,
		RouterLink,
		UiAlert,
		UiButton,
		UiIconButton,
		UiInput
	],
	templateUrl: "./reset-password.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPassword {
	private readonly auth = inject(AuthService);
	private readonly token =
		inject(ActivatedRoute).snapshot.queryParamMap.get("token") ?? "";

	protected readonly status = signal<ResetStatus>("editing");
	protected readonly isLoading = signal(false);
	protected readonly error = signal("");
	protected readonly showPasswords = signal(false);

	protected readonly passwords = signal({
		newPassword: "",
		confirmPassword: ""
	});

	protected readonly form = form(this.passwords, path => {
		maxLength(path.newPassword, PASSWORD_MAX_LENGTH);
		maxLength(path.confirmPassword, PASSWORD_MAX_LENGTH);
		validate(path.newPassword, ({ value }) =>
			failedPasswordRules(value()).length > 0
				? {
						kind: "passwordPolicy",
						message: "Meet every requirement below."
					}
				: null
		);
		validate(path.confirmPassword, ({ value, valueOf }) =>
			value() !== valueOf(path.newPassword)
				? {
						kind: "passwordMismatch",
						message: "Both passwords must match."
					}
				: null
		);
	});

	protected onSubmit(event: Event) {
		event.preventDefault();
		if (this.form().invalid()) {
			this.form().markAsTouched();
			return;
		}

		this.isLoading.set(true);
		this.error.set("");

		this.auth
			.resetPassword(this.token, this.passwords().newPassword)
			.subscribe({
				next: () => {
					this.isLoading.set(false);
					this.status.set("done");
				},
				error: err => {
					this.isLoading.set(false);
					if (err.status === 400 || err.status === 422) {
						this.status.set("invalidLink");
						return;
					}
					this.error.set(this.messageFor(err));
				}
			});
	}

	private messageFor(err: { status?: number }): string {
		if (err.status === 429) {
			return "Too many attempts. Wait a few minutes and try again.";
		}
		return "Could not update your password. Please try again.";
	}
}
