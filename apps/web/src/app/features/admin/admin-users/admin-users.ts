import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { DatePipe } from "@angular/common";
import {
	email,
	form,
	FormField,
	maxLength,
	minLength,
	pattern,
	required,
	validate,
	ValidationError
} from "@angular/forms/signals";
import { AdminUser, UserAdminService } from "../services/user-admin.service";
import {
	UiButton,
	UiIconButton,
	UiInput,
	UiPagination,
	UiSelect
} from "../../../shared/ui";
import {
	fieldErrorsFromResponse,
	validationSummary
} from "../../../shared/utils/validation-errors";

interface CreateUserRequest {
	username: string;
	email: string;
	password: string;
	name: string;
}

// Mirrors the API's RegisterSchema / PasswordPolicySchema, which rejects
// anything else with a 400.
const USERNAME_PATTERN = /^[a-z0-9._]+$/;
const USERNAME_LENGTH_MESSAGE = "Username must be between 4 and 15 characters.";
const USERNAME_PATTERN_MESSAGE =
	"Username must contain only lowercase letters, digits, dots or underscores.";
const NAME_LENGTH_MESSAGE = "Name must be between 4 and 80 characters.";
const NAME_SAFE_TEXT_MESSAGE = "Name must not contain < or > characters.";
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

@Component({
	selector: "app-admin-users",
	imports: [
		DatePipe,
		FormField,
		UiButton,
		UiIconButton,
		UiInput,
		UiPagination,
		UiSelect
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

	protected readonly showCreateModal = signal(false);
	protected readonly isCreating = signal(false);
	protected readonly createError = signal("");
	protected readonly createFieldErrors = signal<Record<string, string>>({});
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

		required(path.password, { message: "Password is required." });
		minLength(path.password, 8, { message: PASSWORD_LENGTH_MESSAGE });
		maxLength(path.password, 15, { message: PASSWORD_LENGTH_MESSAGE });
		validate(path.password, ({ value }) =>
			passwordCompositionError(value())
		);
	});

	toggleShowCreatePassword() {
		this.showCreatePassword.update(v => !v);
	}

	protected readonly showEditModal = signal(false);
	protected readonly editingUser = signal<AdminUser | null>(null);
	protected readonly isEditing = signal(false);
	protected readonly editError = signal("");
	protected readonly editFieldErrors = signal<Record<string, string>>({});
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

		// An empty password means "keep the current one"; the built-in validators
		// skip empty values, so they only kick in once something is typed.
		minLength(path.password, 8, { message: PASSWORD_LENGTH_MESSAGE });
		maxLength(path.password, 15, { message: PASSWORD_LENGTH_MESSAGE });
		validate(path.password, ({ value }) =>
			passwordCompositionError(value())
		);
	});

	toggleShowEditPassword() {
		this.showEditPassword.update(v => !v);
	}

	ngOnInit() {
		this.loadUsers();
	}

	loadUsers() {
		this.isLoading.set(true);
		this.userAdminService.listUsers(this.limit, this.offset()).subscribe({
			next: res => {
				this.users.set(res.users);
				this.total.set(res.total);
				this.isLoading.set(false);
			},
			error: () => this.isLoading.set(false)
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
