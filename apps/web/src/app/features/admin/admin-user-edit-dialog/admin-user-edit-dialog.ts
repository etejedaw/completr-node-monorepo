import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	inject,
	Injector,
	input,
	type OnInit,
	output,
	signal
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
	form,
	FormField,
	maxLength,
	minLength,
	required,
	validate
} from "@angular/forms/signals";
import { RouterLink } from "@angular/router";

import { NAME_LENGTH_MESSAGE } from "../../../core/utils/account-fields";
import {
	PASSWORD_MAX_LENGTH,
	PASSWORD_MIN_LENGTH
} from "../../../core/utils/password-policy";
import { isPremiumRole } from "../../../core/utils/premium";
import { OptionPicker } from "../../../shared/components/option-picker/option-picker";
import {
	UiAlert,
	UiButton,
	UiDescription,
	UiDialog,
	UiFieldError,
	UiFieldLabel,
	UiFieldOptional,
	UiFormField,
	UiIconButton,
	UiInput,
	UiLabel,
	UiSwitch
} from "../../../shared/ui";
import { fieldErrorsFromResponse } from "../../../shared/utils/validation-errors";
import { ROLE_OPTIONS } from "../admin-users/admin-user-role-options";
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
import {
	type AdminUser,
	type EditUserRequest
} from "../services/user-admin.model";
import { UserAdminService } from "../services/user-admin.service";

const EDIT_FIELDS = ["name", "password"] as const;

@Component({
	selector: "app-admin-user-edit-dialog",
	imports: [
		FormField,
		OptionPicker,
		RouterLink,
		UiAlert,
		UiButton,
		UiDescription,
		UiDialog,
		UiFieldError,
		UiFieldLabel,
		UiFieldOptional,
		UiFormField,
		UiIconButton,
		UiInput,
		UiLabel,
		UiSwitch
	],
	templateUrl: "./admin-user-edit-dialog.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminUserEditDialog implements OnInit {
	private readonly userAdminService = inject(UserAdminService);
	private readonly injector = inject(Injector);
	private readonly destroyRef = inject(DestroyRef);

	readonly user = input.required<AdminUser>();
	readonly closed = output<void>();
	readonly saved = output<AdminUser>();
	readonly premiumAccessRequested = output<void>();

	protected readonly roleOptions = ROLE_OPTIONS;
	protected readonly isSaving = signal(false);
	protected readonly showPassword = signal(false);
	private readonly error = signal("");
	private readonly fieldErrors = signal<Record<string, string>>({});
	private readonly serverSnapshot = signal<FormSnapshot | null>(null);

	protected readonly model = signal({
		name: "",
		role: "",
		password: "",
		isActive: true
	});

	protected readonly form = form(this.model, path => {
		const nameChanged = (value: string) => value !== this.user().name;

		required(path.name, {
			when: ({ value }) => nameChanged(value()),
			message: "Name is required."
		});
		minLength(path.name, NAME_MIN_LENGTH, {
			when: ({ value }) => nameChanged(value()),
			message: NAME_LENGTH_MESSAGE
		});
		maxLength(path.name, NAME_MAX_LENGTH, {
			when: ({ value }) => nameChanged(value()),
			message: NAME_LENGTH_MESSAGE
		});
		validate(path.name, ({ value }) =>
			nameChanged(value()) ? safeTextError(value()) : null
		);
		validate(path.name, ({ value }) =>
			nameChanged(value()) ? blankTextError(value()) : null
		);

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
	protected readonly hasPremiumRole = computed(() =>
		isPremiumRole(this.user().role)
	);
	protected readonly premiumAccessHint = computed(() =>
		this.hasPremiumRole()
			? `Premium through the ${this.user().role} role`
			: null
	);

	ngOnInit() {
		const { name, role, isActive } = this.user();
		this.model.set({ name, role, password: "", isActive });
	}

	protected toggleShowPassword() {
		this.showPassword.update(shown => !shown);
	}

	protected setRole(role: string) {
		this.form.role().value.set(role);
	}

	protected setActive(isActive: boolean) {
		this.form.isActive().value.set(isActive);
	}

	protected submit(event: Event) {
		event.preventDefault();
		const user = this.user();
		if (this.isSaving()) return;

		this.error.set("");
		this.fieldErrors.set({});
		this.serverSnapshot.set(null);

		if (this.form().invalid()) {
			this.form().markAsTouched();
			const firstInvalid = EDIT_FIELDS.find(field =>
				this.form[field]().invalid()
			);
			if (firstInvalid) this.focusField(`edit-${firstInvalid}`);
			return;
		}

		const changes = this.changedFields(user);
		if (Object.keys(changes).length === 0) {
			this.closed.emit();
			return;
		}

		this.isSaving.set(true);
		this.userAdminService
			.editUser(user.id, changes)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: updated => {
					this.isSaving.set(false);
					this.saved.emit(updated);
				},
				error: err => {
					this.serverSnapshot.set({ ...this.model() });
					this.fieldErrors.set(fieldErrorsFromResponse(err));
					this.error.set(
						serverErrorOutsideFields(
							err,
							EDIT_FIELDS,
							"Failed to update user"
						)
					);
					this.isSaving.set(false);
				}
			});
	}

	private changedFields(user: AdminUser): EditUserRequest {
		const value = this.form().value();
		const changes: EditUserRequest = {};
		if (value.name !== user.name) changes.name = value.name;
		if (value.role !== user.role) changes.role = value.role;
		if (value.password) changes.password = value.password;
		if (value.isActive !== user.isActive) changes.isActive = value.isActive;
		return changes;
	}

	private focusField(id: string) {
		afterNextRender(() => document.getElementById(id)?.focus(), {
			injector: this.injector
		});
	}
}
