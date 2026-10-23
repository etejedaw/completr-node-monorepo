import {
	ChangeDetectionStrategy,
	Component,
	inject,
	signal
} from "@angular/core";
import {
	email,
	form,
	FormField,
	maxLength,
	minLength,
	pattern,
	required,
	validate
} from "@angular/forms/signals";
import { Router, RouterLink } from "@angular/router";

import { AuthService } from "../../../core/services/auth";
import {
	NAME_LENGTH_MESSAGE,
	NAME_MAX_LENGTH,
	NAME_MIN_LENGTH,
	NAME_SAFE_TEXT_MESSAGE,
	USERNAME_LENGTH_MESSAGE,
	USERNAME_MAX_LENGTH,
	USERNAME_MIN_LENGTH,
	USERNAME_PATTERN,
	USERNAME_PATTERN_MESSAGE
} from "../../../core/utils/account-fields";
import {
	failedPasswordRules,
	PASSWORD_MAX_LENGTH
} from "../../../core/utils/password-policy";
import { PasswordRules } from "../../../shared/components/password-rules/password-rules";
import { UiButton, UiInput } from "../../../shared/ui";

const UNSAFE_TEXT = /[<>]/;

@Component({
	selector: "app-register",
	imports: [FormField, PasswordRules, RouterLink, UiButton, UiInput],
	templateUrl: "./register.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Register {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);

	protected readonly isLoading = signal(false);
	protected readonly error = signal("");

	protected readonly model = signal({
		username: "",
		email: "",
		name: "",
		password: ""
	});

	readonly form = form(this.model, path => {
		required(path.username, { message: "Username is required." });
		minLength(path.username, USERNAME_MIN_LENGTH, {
			message: USERNAME_LENGTH_MESSAGE
		});
		maxLength(path.username, USERNAME_MAX_LENGTH, {
			message: USERNAME_LENGTH_MESSAGE
		});
		pattern(path.username, USERNAME_PATTERN, {
			message: USERNAME_PATTERN_MESSAGE
		});

		required(path.email, { message: "Email is required." });
		email(path.email, { message: "Enter a valid email address." });

		required(path.name, { message: "Name is required." });
		minLength(path.name, NAME_MIN_LENGTH, { message: NAME_LENGTH_MESSAGE });
		maxLength(path.name, NAME_MAX_LENGTH, { message: NAME_LENGTH_MESSAGE });
		validate(path.name, ({ value }) =>
			UNSAFE_TEXT.test(value())
				? { kind: "unsafeText", message: NAME_SAFE_TEXT_MESSAGE }
				: null
		);

		maxLength(path.password, PASSWORD_MAX_LENGTH);
		validate(path.password, ({ value }) =>
			failedPasswordRules(value()).length > 0
				? {
						kind: "passwordPolicy",
						message: "Meet every requirement below."
					}
				: null
		);
	});

	onSubmit(event: Event) {
		event.preventDefault();
		if (this.isLoading()) return;

		if (this.form().invalid()) {
			this.form().markAsTouched();
			return;
		}

		this.isLoading.set(true);
		this.error.set("");

		const { username, email, name, password } = this.form().value();
		this.auth.register({ username, email, name, password }).subscribe({
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
