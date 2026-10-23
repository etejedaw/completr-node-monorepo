import {
	ChangeDetectionStrategy,
	Component,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import {
	form,
	FormField,
	maxLength,
	minLength,
	pattern,
	required,
	validate
} from "@angular/forms/signals";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";

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
import {
	UiAlert,
	UiButton,
	UiIconButton,
	UiInput,
	UiSkeleton
} from "../../../shared/ui";
import { AuthPage } from "../auth-page/auth-page";

type InvitationStatus = "loading" | "ready" | "invalid";

const UNSAFE_TEXT = /[<>]/;

@Component({
	selector: "app-accept-invite",
	imports: [
		AuthPage,
		FormField,
		PasswordRules,
		RouterLink,
		UiAlert,
		UiButton,
		UiIconButton,
		UiInput,
		UiSkeleton
	],
	templateUrl: "./accept-invite.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AcceptInvite implements OnInit {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);
	private readonly token =
		inject(ActivatedRoute).snapshot.queryParamMap.get("token") ?? "";

	protected readonly status = signal<InvitationStatus>(
		this.token ? "loading" : "invalid"
	);
	protected readonly invitedEmail = signal("");
	protected readonly isSubmitting = signal(false);
	protected readonly error = signal("");
	protected readonly showPasswords = signal(false);

	protected readonly model = signal({
		username: "",
		name: "",
		password: "",
		confirmPassword: ""
	});

	protected readonly form = form(this.model, path => {
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
		validate(path.confirmPassword, ({ value, valueOf }) =>
			value() !== valueOf(path.password)
				? {
						kind: "passwordMismatch",
						message: "Both passwords must match."
					}
				: null
		);
	});

	ngOnInit() {
		if (!this.token) return;
		this.auth.getInvitation(this.token).subscribe({
			next: invitation => {
				this.invitedEmail.set(invitation.email);
				this.status.set("ready");
			},
			error: () => this.status.set("invalid")
		});
	}

	protected onSubmit(event: Event) {
		event.preventDefault();
		if (this.isSubmitting()) return;

		if (this.form().invalid()) {
			this.form().markAsTouched();
			return;
		}

		this.isSubmitting.set(true);
		this.error.set("");

		const { username, name, password } = this.form().value();
		this.auth
			.acceptInvitation({ token: this.token, username, name, password })
			.subscribe({
				next: () => {
					this.auth.loadUser().subscribe({
						next: () => this.router.navigateByUrl("/backlog"),
						error: () => this.router.navigateByUrl("/backlog")
					});
				},
				error: err => {
					this.isSubmitting.set(false);
					if (err.status === 404) {
						this.status.set("invalid");
						return;
					}
					this.error.set(this.messageFor(err));
				}
			});
	}

	private messageFor(err: { status?: number }): string {
		if (err.status === 409) {
			return "That username is already taken. Try another one.";
		}
		if (err.status === 429) {
			return "Too many attempts. Wait a minute and try again.";
		}
		if (err.status === 422) {
			return "Some fields don't meet the requirements. Check them and try again.";
		}
		return "Could not create your account. Please try again.";
	}
}
