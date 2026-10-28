import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	type OnInit,
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
	validate,
	type ValidationError
} from "@angular/forms/signals";

import {
	NAME_LENGTH_MESSAGE,
	NAME_SAFE_TEXT_MESSAGE,
	USERNAME_LENGTH_MESSAGE,
	USERNAME_PATTERN,
	USERNAME_PATTERN_MESSAGE
} from "../../../core/utils/account-fields";
import { avatarRing } from "../../../core/utils/premium";
import {
	elevatedRoleBadge,
	type RoleBadge
} from "../../../core/utils/role-badge";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import {
	UiAlert,
	UiAvatar,
	UiButton,
	UiDialog,
	UiFieldLabel,
	UiFormField,
	UiInput,
	UiLabel,
	UiPagination,
	UiPlainEmptyState,
	UiSelect,
	UiSkeleton
} from "../../../shared/ui";
import {
	fieldErrorsFromResponse,
	validationSummary
} from "../../../shared/utils/validation-errors";
import { AdminInvitations } from "../admin-invitations/admin-invitations";
import {
	type AdminUser,
	UserAdminService
} from "../services/user-admin.service";

interface CreateUserRequest {
	username: string;
	email: string;
	password: string;
	name: string;
}

// Mirrors the API's RegisterSchema / PasswordPolicySchema, which rejects
// anything else with a 400.
const PASSWORD_LENGTH_MESSAGE = "Password must be between 8 and 15 characters.";
const PASSWORD_COMPOSITION_RULES = [
	{
		pattern: /[a-z]/,
		message: "Password must contain at least one lowercase letter."
	},
	{
		pattern: /[A-Z]/,
		message: "Password must contain at least one uppercase letter."
	},
	{ pattern: /[0-9]/, message: "Password must contain at least one number." },
	{
		pattern: /[^A-Za-z0-9]/,
		message: "Password must contain at least one special character."
	}
];

/** Empty values are left to `required`, so a blank field yields a single message. */
function safeTextError(value: string): ValidationError.WithoutFieldTree | null {
	if (!value || !/[<>]/.test(value)) return null;
	return { kind: "unsafeText", message: NAME_SAFE_TEXT_MESSAGE };
}

function blankTextError(
	value: string
): ValidationError.WithoutFieldTree | null {
	if (!value || value.trim()) return null;
	return { kind: "blankText", message: "Name is required." };
}

function passwordCompositionError(
	value: string
): ValidationError.WithoutFieldTree | null {
	if (!value) return null;
	const failed = PASSWORD_COMPOSITION_RULES.find(
		rule => !rule.pattern.test(value)
	);
	return failed
		? { kind: "passwordComposition", message: failed.message }
		: null;
}

function summarize(errors: readonly ValidationError.WithFieldTree[]): string {
	return errors
		.map(error => error.message)
		.filter((message): message is string => !!message)
		.join(" · ");
}

const USER_ROLE_BADGE: RoleBadge = {
	label: "User",
	className: "bg-fg-muted/10 text-fg-muted",
	icon: null
};

type FormSnapshot = Record<string, unknown>;

function errorsStillMatching(
	errors: Record<string, string>,
	snapshot: FormSnapshot | null,
	current: FormSnapshot
): Record<string, string> {
	if (!snapshot) return errors;
	return Object.fromEntries(
		Object.entries(errors).filter(
			([field]) => current[field] === snapshot[field]
		)
	);
}

function editedSince(snapshot: FormSnapshot | null, current: FormSnapshot) {
	return (
		!!snapshot &&
		Object.keys(current).some(field => current[field] !== snapshot[field])
	);
}

@Component({
	selector: "app-admin-users",
	imports: [
		AdminInvitations,
		DatePipe,
		FormField,
		LibraryHero,
		UiAlert,
		UiAvatar,
		UiButton,
		UiDialog,
		UiFieldLabel,
		UiFormField,
		UiInput,
		UiLabel,
		UiPagination,
		UiPlainEmptyState,
		UiSelect,
		UiSkeleton
	],
	templateUrl: "./admin-users.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminUsers implements OnInit {
	private readonly userAdminService = inject(UserAdminService);

	protected readonly Math = Math;
	protected readonly users = signal<AdminUser[]>([]);
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = 50;
	protected readonly isLoading = signal(true);
	protected readonly loadFailed = signal(false);
	protected readonly skeletonRows = [1, 2, 3, 4, 5, 6];
	protected readonly avatarRing = avatarRing;

	protected readonly showCreateModal = signal(false);
	protected readonly isCreating = signal(false);
	protected readonly createError = signal("");
	protected readonly createFieldErrors = signal<Record<string, string>>({});
	private readonly createServerSnapshot = signal<FormSnapshot | null>(null);
	protected readonly showCreatePassword = signal(false);

	protected readonly createModel = signal({
		username: "",
		email: "",
		password: "",
		name: ""
	});

	readonly createForm = form(this.createModel, path => {
		required(path.username, { message: "Username is required." });
		minLength(path.username, 4, { message: USERNAME_LENGTH_MESSAGE });
		maxLength(path.username, 15, { message: USERNAME_LENGTH_MESSAGE });
		pattern(path.username, USERNAME_PATTERN, {
			message: USERNAME_PATTERN_MESSAGE
		});

		required(path.email, { message: "Email is required." });
		email(path.email, { message: "Email is not valid." });

		required(path.name, { message: "Name is required." });
		minLength(path.name, 4, { message: NAME_LENGTH_MESSAGE });
		maxLength(path.name, 80, { message: NAME_LENGTH_MESSAGE });
		validate(path.name, ({ value }) => safeTextError(value()));
		validate(path.name, ({ value }) => blankTextError(value()));

		required(path.password, { message: "Password is required." });
		minLength(path.password, 8, { message: PASSWORD_LENGTH_MESSAGE });
		maxLength(path.password, 15, { message: PASSWORD_LENGTH_MESSAGE });
		validate(path.password, ({ value }) =>
			passwordCompositionError(value())
		);
	});

	protected readonly visibleCreateFieldErrors = computed(() =>
		errorsStillMatching(
			this.createFieldErrors(),
			this.createServerSnapshot(),
			this.createModel()
		)
	);
	protected readonly visibleCreateError = computed(() =>
		editedSince(this.createServerSnapshot(), this.createModel())
			? ""
			: this.createError()
	);

	toggleShowCreatePassword() {
		this.showCreatePassword.update(v => !v);
	}

	protected readonly showEditModal = signal(false);
	protected readonly editingUser = signal<AdminUser | null>(null);
	protected readonly isEditing = signal(false);
	protected readonly editError = signal("");
	protected readonly editFieldErrors = signal<Record<string, string>>({});
	private readonly editServerSnapshot = signal<FormSnapshot | null>(null);
	protected readonly showEditPassword = signal(false);

	protected readonly editModel = signal({
		name: "",
		role: "",
		password: "",
		isActive: true
	});

	readonly editForm = form(this.editModel, path => {
		// Only the fields the admin actually changed are sent, so only those are
		// validated: an untouched edit form still closes without calling the API.
		const nameChanged = (value: string) =>
			value !== (this.editingUser()?.name ?? "");

		required(path.name, {
			when: ({ value }) => nameChanged(value()),
			message: "Name is required."
		});
		minLength(path.name, 4, {
			when: ({ value }) => nameChanged(value()),
			message: NAME_LENGTH_MESSAGE
		});
		maxLength(path.name, 80, {
			when: ({ value }) => nameChanged(value()),
			message: NAME_LENGTH_MESSAGE
		});
		validate(path.name, ({ value }) =>
			nameChanged(value()) ? safeTextError(value()) : null
		);
		validate(path.name, ({ value }) =>
			nameChanged(value()) ? blankTextError(value()) : null
		);

		// An empty password means "keep the current one"; the built-in validators
		// skip empty values, so they only kick in once something is typed.
		minLength(path.password, 8, { message: PASSWORD_LENGTH_MESSAGE });
		maxLength(path.password, 15, { message: PASSWORD_LENGTH_MESSAGE });
		validate(path.password, ({ value }) =>
			passwordCompositionError(value())
		);
	});

	protected readonly visibleEditFieldErrors = computed(() =>
		errorsStillMatching(
			this.editFieldErrors(),
			this.editServerSnapshot(),
			this.editModel()
		)
	);
	protected readonly visibleEditError = computed(() =>
		editedSince(this.editServerSnapshot(), this.editModel())
			? ""
			: this.editError()
	);

	toggleShowEditPassword() {
		this.showEditPassword.update(v => !v);
	}

	ngOnInit() {
		this.loadUsers();
	}

	protected roleBadge(role: string): RoleBadge {
		return elevatedRoleBadge(role) ?? USER_ROLE_BADGE;
	}

	loadUsers() {
		this.isLoading.set(true);
		this.loadFailed.set(false);
		this.userAdminService.listUsers(this.limit, this.offset()).subscribe({
			next: res => {
				this.users.set(res.users);
				this.total.set(res.total);
				this.isLoading.set(false);
			},
			error: () => {
				this.loadFailed.set(true);
				this.isLoading.set(false);
			}
		});
	}

	openCreate() {
		this.createModel.set({
			username: "",
			email: "",
			password: "",
			name: ""
		});
		this.createForm().reset();
		this.createError.set("");
		this.createFieldErrors.set({});
		this.createServerSnapshot.set(null);
		this.showCreatePassword.set(false);
		this.showCreateModal.set(true);
	}

	closeCreate() {
		this.showCreateModal.set(false);
	}

	submitCreate(event: Event) {
		event.preventDefault();
		if (this.isCreating()) return;

		this.createError.set("");
		this.createFieldErrors.set({});
		this.createServerSnapshot.set(null);

		// Deliberate divergence from the rest of the repo, which disables the submit
		// button on `form().invalid()`: an admin facing a dead button cannot tell what
		// is missing — the silent failure FB-035 was about. The button stays enabled,
		// and submitting an invalid form surfaces the reasons instead.
		if (this.createForm().invalid()) {
			this.createForm().markAsTouched();
			this.createError.set(summarize(this.createForm().errorSummary()));
			return;
		}

		this.isCreating.set(true);

		const data: CreateUserRequest = this.createForm().value();

		this.userAdminService.createUser(data).subscribe({
			next: () => {
				this.isCreating.set(false);
				this.closeCreate();
				this.offset.set(0);
				this.loadUsers();
			},
			error: err => {
				this.createServerSnapshot.set({ ...this.createModel() });
				this.createFieldErrors.set(fieldErrorsFromResponse(err));
				this.createError.set(
					validationSummary(err) ||
						err.error?.detail ||
						err.error?.title ||
						"Failed to create user"
				);
				this.isCreating.set(false);
			}
		});
	}

	openEdit(user: AdminUser) {
		this.editingUser.set(user);
		this.editModel.set({
			name: user.name,
			role: user.role,
			password: "",
			isActive: user.isActive
		});
		this.editForm().reset();
		this.editError.set("");
		this.editFieldErrors.set({});
		this.editServerSnapshot.set(null);
		this.showEditPassword.set(false);
		this.showEditModal.set(true);
	}

	closeEdit() {
		this.showEditModal.set(false);
		this.editingUser.set(null);
	}

	submitEdit(event: Event) {
		event.preventDefault();
		const user = this.editingUser();
		if (!user || this.isEditing()) return;

		this.editError.set("");
		this.editFieldErrors.set({});
		this.editServerSnapshot.set(null);

		// Same divergence as submitCreate: the button stays enabled so an invalid
		// form explains itself instead of doing nothing.
		if (this.editForm().invalid()) {
			this.editForm().markAsTouched();
			this.editError.set(summarize(this.editForm().errorSummary()));
			return;
		}

		const value = this.editForm().value();
		const data: {
			name?: string;
			password?: string;
			role?: string;
			isActive?: boolean;
		} = {};
		if (value.name !== user.name) data.name = value.name;
		if (value.role !== user.role) data.role = value.role;
		if (value.password) data.password = value.password;
		if (value.isActive !== user.isActive) data.isActive = value.isActive;

		if (Object.keys(data).length === 0) {
			this.closeEdit();
			return;
		}

		this.isEditing.set(true);

		this.userAdminService.editUser(user.id, data).subscribe({
			next: updated => {
				this.users.update(list =>
					list.map(u => (u.id === updated.id ? updated : u))
				);
				this.isEditing.set(false);
				this.closeEdit();
			},
			error: err => {
				this.editServerSnapshot.set({ ...this.editModel() });
				this.editFieldErrors.set(fieldErrorsFromResponse(err));
				this.editError.set(
					validationSummary(err) ||
						err.error?.detail ||
						err.error?.title ||
						"Failed to update user"
				);
				this.isEditing.set(false);
			}
		});
	}

	goToOffset(offset: number) {
		this.offset.set(offset);
		this.loadUsers();
	}
}
