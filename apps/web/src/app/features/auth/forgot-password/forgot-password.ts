import {
	ChangeDetectionStrategy,
	Component,
	inject,
	signal
} from "@angular/core";
import { email, form, FormField, required } from "@angular/forms/signals";
import { RouterLink } from "@angular/router";

import { AuthService } from "../../../core/services/auth";
import { UiAlert, UiButton, UiInput } from "../../../shared/ui";
import { AuthPage } from "../auth-page/auth-page";

@Component({
	selector: "app-forgot-password",
	imports: [AuthPage, FormField, RouterLink, UiAlert, UiButton, UiInput],
	templateUrl: "./forgot-password.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForgotPassword {
	private readonly auth = inject(AuthService);

	protected readonly isLoading = signal(false);
	protected readonly error = signal("");
	protected readonly sentTo = signal("");

	protected readonly model = signal({ email: "" });

	protected readonly form = form(this.model, path => {
		required(path.email);
		email(path.email);
	});

	protected onSubmit(event: Event) {
		event.preventDefault();
		if (this.form().invalid()) return;

		this.isLoading.set(true);
		this.error.set("");

		const { email: address } = this.form().value();
		this.auth.requestPasswordReset(address).subscribe({
			next: () => {
				this.isLoading.set(false);
				this.sentTo.set(address);
			},
			error: err => {
				this.isLoading.set(false);
				this.error.set(this.messageFor(err));
			}
		});
	}

	protected tryAnotherEmail() {
		this.sentTo.set("");
		this.model.set({ email: "" });
		this.form().reset();
	}

	private messageFor(err: { status?: number }): string {
		if (err.status === 429) {
			return "Too many requests. Wait a few minutes and try again.";
		}
		if (err.status === 503) {
			return "Password recovery is not available right now. Try again later.";
		}
		return "Could not send the reset link. Please try again.";
	}
}
