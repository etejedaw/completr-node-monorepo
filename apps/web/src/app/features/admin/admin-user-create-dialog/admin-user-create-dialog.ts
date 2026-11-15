import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	inject,
	Injector,
	output,
	signal
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
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

import {
	NAME_LENGTH_MESSAGE,
	USERNAME_LENGTH_MESSAGE,
	USERNAME_PATTERN,
	USERNAME_PATTERN_MESSAGE
} from "../../../core/utils/account-fields";
import {
	PASSWORD_MAX_LENGTH,
	PASSWORD_MIN_LENGTH
} from "../../../core/utils/password-policy";
import {
	UiAlert,
	UiButton,
	UiDescription,
	UiDialog,
	UiFieldError,
	UiFieldLabel,
	UiFormField,
	UiIconButton,
	UiInput,
	UiLabel
} from "../../../shared/ui";
import { fieldErrorsFromResponse } from "../../../shared/utils/validation-errors";
import {
	blankTextError,
	editedSince,
	errorsStillMatching,
	NAME_MAX_LENGTH,
	NAME_MIN_LENGTH,
	PASSWORD_LENGTH_MESSAGE,
	passwordCompositionError,
	safeTextError,
	serverErrorOutsideFields
} from "../admin-users/admin-user-validation";
import { type FormSnapshot } from "../admin-users/admin-users.model";
import { UserAdminService } from "../services/user-admin.service";

const CREATE_FIELDS = ["username", "name", "email", "password"] as const;
const USERNAME_MIN_LENGTH = 4;
const USERNAME_MAX_LENGTH = 15;

@Component({
	selector: "app-admin-user-create-dialog",
	imports: [
		FormField,
		UiAlert,
		UiButton,
		UiDescription,
		UiDialog,
		UiFieldError,
		UiFieldLabel,
		UiFormField,
		UiIconButton,
		UiInput,
		UiLabel
	],
	templateUrl: "./admin-user-create-dialog.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminUserCreateDialog {
	private readonly userAdminService = inject(UserAdminService);
	private readonly injector = inject(Injector);
	private readonly destroyRef = inject(DestroyRef);

	readonly closed = output<void>();
	readonly created = output<void>();

	protected readonly isCreating = signal(false);
	protected readonly showPassword = signal(false);
	private readonly error = signal("");
	private readonly fieldErrors = signal<Record<string, string>>({});
	private readonly serverSnapshot = signal<FormSnapshot | null>(null);

	protected readonly model = signal({
		username: "",
		email: "",
		password: "",
		name: ""
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

		required(path.email, { message: "Email is required." });
		email(path.email, { message: "Email is not valid." });

		required(path.name, { message: "Name is required." });
		minLength(path.name, NAME_MIN_LENGTH, { message: NAME_LENGTH_MESSAGE });
		maxLength(path.name, NAME_MAX_LENGTH, { message: NAME_LENGTH_MESSAGE });
		validate(path.name, ({ value }) => safeTextError(value()));
		validate(path.name, ({ value }) => blankTextError(value()));

		required(path.password, { message: "Password is required." });
		minLength(path.password, PASSWORD_MIN_LENGTH, {
			message: PASSWORD_LENGTH_MESSAGE
		});
		maxLength(path.password, PASSWORD_MAX_LENGTH, {
			message: PASSWORD_LENGTH_MESSAGE
		});
		validate(path.password, ({ value }) =>
			passwordCompositionError(value())
		);
	});

	protected readonly visibleFieldErrors = computed(() =>
		errorsStillMatching(
			this.fieldErrors(),
			this.serverSnapshot(),
			this.model()
		)
	);
	protected readonly visibleError = computed(() =>
		editedSince(this.serverSnapshot(), this.model()) ? "" : this.error()
	);

	protected toggleShowPassword() {
		this.showPassword.update(shown => !shown);
	}

	protected submit(event: Event) {
		event.preventDefault();
		if (this.isCreating()) return;

		this.error.set("");
		this.fieldErrors.set({});
		this.serverSnapshot.set(null);

		if (this.form().invalid()) {
			this.form().markAsTouched();
			const firstInvalid = CREATE_FIELDS.find(field =>
				this.form[field]().invalid()
			);
			if (firstInvalid) this.focusField(`create-${firstInvalid}`);
			return;
		}

		this.isCreating.set(true);
		this.userAdminService
			.createUser(this.form().value())
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.isCreating.set(false);
					this.created.emit();
				},
				error: err => {
					this.serverSnapshot.set({ ...this.model() });
					this.fieldErrors.set(fieldErrorsFromResponse(err));
					this.error.set(
						serverErrorOutsideFields(
							err,
							CREATE_FIELDS,
							"Failed to create user"
						)
					);
					this.isCreating.set(false);
				}
			});
	}

	private focusField(id: string) {
		afterNextRender(() => document.getElementById(id)?.focus(), {
			injector: this.injector
		});
	}
}
