import { DatePipe } from "@angular/common";
import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	inject,
	Injector,
	type OnInit,
	signal,
	viewChild
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
	validate,
	type ValidationError
} from "@angular/forms/signals";
import { Router, RouterLink } from "@angular/router";
import {
	debounceTime,
	distinctUntilChanged,
	Subject,
	type Subscription
} from "rxjs";

import {
	NAME_LENGTH_MESSAGE,
	NAME_SAFE_TEXT_MESSAGE,
	USERNAME_LENGTH_MESSAGE,
	USERNAME_PATTERN,
	USERNAME_PATTERN_MESSAGE
} from "../../../core/utils/account-fields";
import { avatarRing, isPremiumRole } from "../../../core/utils/premium";
import { elevatedRoleBadge } from "../../../core/utils/role-badge";
import { type RoleBadge } from "../../../core/utils/role-badge.model";
import { ActionMenu } from "../../../shared/components/action-menu/action-menu";
import { type ActionMenuItem } from "../../../shared/components/action-menu/action-menu.model";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../../shared/components/library-toolbar/library-toolbar";
import { OptionPicker } from "../../../shared/components/option-picker/option-picker";
import { type PickerOption } from "../../../shared/components/option-picker/option-picker.model";
import {
	UiAlert,
	UiAvatar,
	UiBadge,
	UiButton,
	UiDialog,
	UiEyebrow,
	UiFieldLabel,
	UiFieldOptional,
	UiFormField,
	UiIconButton,
	UiInput,
	UiLabel,
	UiNoMatches,
	UiPagination,
	UiPlainEmptyState,
	UiSearchBar,
	UiSkeleton,
	UiSwitch,
	UiTable
} from "../../../shared/ui";
import { fieldErrorsFromResponse } from "../../../shared/utils/validation-errors";
import { AdminInvitations } from "../admin-invitations/admin-invitations";
import { AdminPremiumAccess } from "../admin-premium-access/admin-premium-access";
import { type AdminUser } from "../services/user-admin.model";
import { UserAdminService } from "../services/user-admin.service";
import { type CreateUserRequest } from "./admin-users.model";

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

function serverErrorOutsideFields(
	err: { error?: { detail?: string; title?: string } | null },
	fields: readonly string[],
	fallback: string
): string {
	const issues = Object.entries(fieldErrorsFromResponse(err));
	if (issues.length === 0)
		return err.error?.detail || err.error?.title || fallback;
	return issues
		.filter(([field]) => !fields.includes(field))
		.map(([, message]) => message)
		.join(" · ");
}

const CREATE_FIELDS = ["username", "name", "email", "password"] as const;
const EDIT_FIELDS = ["name", "password"] as const;

const SEARCH_DEBOUNCE_MS = 300;

const ROLE_OPTIONS: readonly PickerOption[] = [
	{ value: "user", label: "User", icon: "person" },
	{
		value: "premium",
		label: "Premium",
		icon: "workspace_premium",
		iconClass: "text-premium"
	},
	{
		value: "moderator",
		label: "Moderator",
		icon: "verified_user",
		iconClass: "text-info"
	},
	{
		value: "admin",
		label: "Admin",
		icon: "shield",
		iconClass: "text-admin"
	}
];

type UserRowAction = "edit" | "premium" | "profile";

const USER_ROLE_BADGE: RoleBadge = {
	label: "User",
	className: "bg-fg-muted/10 text-fg-muted",
	tone: "neutral",
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
		ActionMenu,
		AdminInvitations,
		AdminPremiumAccess,
		DatePipe,
		FormField,
		LibraryHero,
		LibraryToolbar,
		OptionPicker,
		RouterLink,
		UiAlert,
		UiAvatar,
		UiBadge,
		UiButton,
		UiDialog,
		UiEyebrow,
		UiFieldLabel,
		UiFieldOptional,
		UiFormField,
		UiIconButton,
		UiInput,
		UiLabel,
		UiNoMatches,
		UiPagination,
		UiPlainEmptyState,
		UiSearchBar,
		UiSkeleton,
		UiSwitch,
		UiTable
	],
	templateUrl: "./admin-users.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminUsers implements OnInit {
	private readonly userAdminService = inject(UserAdminService);
	private readonly router = inject(Router);
	private readonly injector = inject(Injector);
	protected readonly invitationsPanel = viewChild.required(AdminInvitations);
	private readonly searchChanges = new Subject<string>();
	private listSubscription: Subscription | null = null;

	protected readonly Math = Math;
	protected readonly roleOptions = ROLE_OPTIONS;
	protected readonly users = signal<AdminUser[]>([]);
	protected readonly total = signal(0);
	protected readonly accountsTotal = signal(0);
	protected readonly query = signal("");
	protected readonly search = signal("");
	protected readonly offset = signal(0);
	protected readonly limit = 50;
	protected readonly isLoading = signal(true);
	protected readonly loadFailed = signal(false);
	protected readonly skeletonRows = [1, 2, 3, 4, 5, 6];
	protected readonly avatarRing = avatarRing;
	protected readonly hasNoAccounts = computed(
		() =>
			!this.isLoading() &&
			!this.loadFailed() &&
			!this.search() &&
			this.users().length === 0
	);
	protected readonly rowActions = computed(
		() =>
			new Map(this.users().map(user => [user.id, this.actionsFor(user)]))
	);

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
	protected readonly showPremiumAccess = signal(false);
	protected readonly premiumAccessUser = signal<AdminUser | null>(null);

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

	constructor() {
		this.searchChanges
			.pipe(
				debounceTime(SEARCH_DEBOUNCE_MS),
				distinctUntilChanged(),
				takeUntilDestroyed()
			)
			.subscribe(search => this.applySearch(search));
		inject(DestroyRef).onDestroy(() =>
			this.listSubscription?.unsubscribe()
		);
	}

	ngOnInit() {
		this.loadUsers();
	}

	protected onSearch(value: string) {
		this.query.set(value);
		this.searchChanges.next(value.trim());
	}

	protected clearSearch() {
		this.query.set("");
		this.searchChanges.next("");
		this.applySearch("");
	}

	private applySearch(search: string) {
		if (search === this.search()) return;
		this.search.set(search);
		this.offset.set(0);
		this.loadUsers();
	}

	protected roleBadge(role: string): RoleBadge {
		return elevatedRoleBadge(role) ?? USER_ROLE_BADGE;
	}

	loadUsers() {
		this.listSubscription?.unsubscribe();
		this.isLoading.set(true);
		this.loadFailed.set(false);
		const search = this.search();
		this.listSubscription = this.userAdminService
			.listUsers(this.limit, this.offset(), search)
			.subscribe({
				next: res => {
					this.users.set(res.users);
					this.total.set(res.total);
					if (!search) this.accountsTotal.set(res.total);
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
			const firstInvalid = CREATE_FIELDS.find(field =>
				this.createForm[field]().invalid()
			);
			if (firstInvalid) this.focusField(`create-${firstInvalid}`);
			return;
		}

		this.isCreating.set(true);

		const data: CreateUserRequest = this.createForm().value();

		this.userAdminService.createUser(data).subscribe({
			next: () => {
				this.isCreating.set(false);
				this.closeCreate();
				if (this.search())
					this.accountsTotal.update(count => count + 1);
				this.offset.set(0);
				this.loadUsers();
			},
			error: err => {
				this.createServerSnapshot.set({ ...this.createModel() });
				this.createFieldErrors.set(fieldErrorsFromResponse(err));
				this.createError.set(
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

	protected setEditRole(role: string) {
		this.editForm.role().value.set(role);
	}

	protected setEditActive(isActive: boolean) {
		this.editForm.isActive().value.set(isActive);
	}

	protected onRowAction(user: AdminUser, action: string) {
		switch (action as UserRowAction) {
			case "edit":
				this.openEdit(user);
				return;
			case "premium":
				this.openPremiumAccess(user);
				return;
			case "profile":
				void this.router.navigate(["/user", user.username]);
				return;
		}
	}

	private actionsFor(user: AdminUser): ActionMenuItem[] {
		return [
			{ id: "edit", label: "Edit user", icon: "edit" },
			{
				id: "premium",
				label: "Premium access",
				icon: "workspace_premium",
				premium: !this.hasPremiumRole(user),
				disabled: this.hasPremiumRole(user),
				hint: this.premiumAccessHint(user) ?? undefined
			},
			{ id: "profile", label: "View profile", icon: "account_circle" }
		];
	}

	protected hasPremiumRole(user: AdminUser): boolean {
		return isPremiumRole(user.role);
	}

	protected premiumAccessLabel(user: AdminUser): string {
		return this.hasPremiumRole(user)
			? `Premium access for ${user.username} comes from the ${user.role} role`
			: `Premium access for ${user.username}`;
	}

	protected premiumAccessHint(user: AdminUser): string | null {
		return this.hasPremiumRole(user)
			? `Premium through the ${user.role} role`
			: null;
	}

	openPremiumAccess(user: AdminUser) {
		if (this.hasPremiumRole(user)) return;
		this.closeEdit();
		this.premiumAccessUser.set(user);
		this.showPremiumAccess.set(true);
	}

	closePremiumAccess() {
		this.showPremiumAccess.set(false);
		this.premiumAccessUser.set(null);
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
			const firstInvalid = EDIT_FIELDS.find(field =>
				this.editForm[field]().invalid()
			);
			if (firstInvalid) this.focusField(`edit-${firstInvalid}`);
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
					serverErrorOutsideFields(
						err,
						EDIT_FIELDS,
						"Failed to update user"
					)
				);
				this.isEditing.set(false);
			}
		});
	}

	private focusField(id: string) {
		afterNextRender(() => document.getElementById(id)?.focus(), {
			injector: this.injector
		});
	}

	goToOffset(offset: number) {
		this.offset.set(offset);
		this.loadUsers();
	}
}
