import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	inject,
	type OnInit,
	signal,
	viewChild
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import { debounceTime, Subject, type Subscription } from "rxjs";

import { avatarRing, isPremiumRole } from "../../../core/utils/premium";
import { elevatedRoleBadge } from "../../../core/utils/role-badge";
import { type RoleBadge } from "../../../core/utils/role-badge.model";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { LibraryToolbar } from "../../../shared/components/library-toolbar/library-toolbar";
import { PageSearch } from "../../../shared/components/page-search/page-search";
import {
	UiActionMenu,
	type UiActionMenuItem,
	UiAlert,
	UiAvatar,
	UiBadge,
	UiButton,
	UiEyebrow,
	UiIconButton,
	UiNoMatches,
	UiPagination,
	UiPlainEmptyState,
	UiSkeleton,
	UiTable
} from "../../../shared/ui";
import { AdminAccountDeletionDialog } from "../admin-account-deletion-dialog/admin-account-deletion-dialog";
import { AdminDataRequests } from "../admin-data-requests/admin-data-requests";
import { AdminInvitations } from "../admin-invitations/admin-invitations";
import { AdminPremiumAccess } from "../admin-premium-access/admin-premium-access";
import { AdminUserCreateDialog } from "../admin-user-create-dialog/admin-user-create-dialog";
import { AdminUserEditDialog } from "../admin-user-edit-dialog/admin-user-edit-dialog";
import { type AdminUser } from "../services/user-admin.model";
import { UserAdminService } from "../services/user-admin.service";
import {
	canDeleteAccount,
	injectAdminUserDataActions
} from "./admin-user-data-actions";

const SEARCH_DEBOUNCE_MS = 300;

type UserRowAction = "edit" | "premium" | "download-data" | "delete-account";

const USER_ROLE_BADGE: RoleBadge = {
	label: "User",
	tone: "neutral",
	icon: null
};

@Component({
	selector: "app-admin-users",
	imports: [
		PageSearch,
		UiActionMenu,
		AdminAccountDeletionDialog,
		AdminDataRequests,
		AdminInvitations,
		AdminPremiumAccess,
		AdminUserCreateDialog,
		AdminUserEditDialog,
		DatePipe,
		LibraryHero,
		LibraryToolbar,
		RouterLink,
		UiAlert,
		UiAvatar,
		UiBadge,
		UiButton,
		UiEyebrow,
		UiIconButton,
		UiNoMatches,
		UiPagination,
		UiPlainEmptyState,
		UiSkeleton,
		UiTable
	],
	templateUrl: "./admin-users.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminUsers implements OnInit {
	private readonly userAdminService = inject(UserAdminService);
	protected readonly invitationsPanel = viewChild.required(AdminInvitations);
	private readonly dataRequestsPanel = viewChild.required(AdminDataRequests);
	protected readonly dataActions = injectAdminUserDataActions({
		accountDeleted: user => this.onAccountDeleted(user),
		accountMissing: () => this.loadUsers()
	});
	protected readonly canDeleteAccount = canDeleteAccount;
	private readonly searchChanges = new Subject<string>();
	private listSubscription: Subscription | null = null;

	protected readonly Math = Math;
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
	protected readonly rowDataActions = computed(
		() =>
			new Map(
				this.users().map(user => [user.id, this.dataActionItems(user)])
			)
	);

	protected readonly showCreateModal = signal(false);
	protected readonly showEditModal = signal(false);
	protected readonly editingUser = signal<AdminUser | null>(null);
	protected readonly showPremiumAccess = signal(false);
	protected readonly premiumAccessUser = signal<AdminUser | null>(null);

	constructor() {
		this.searchChanges
			.pipe(debounceTime(SEARCH_DEBOUNCE_MS), takeUntilDestroyed())
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
		this.showCreateModal.set(true);
	}

	closeCreate() {
		this.showCreateModal.set(false);
	}

	protected onUserCreated() {
		this.closeCreate();
		if (this.search()) this.accountsTotal.update(count => count + 1);
		this.offset.set(0);
		this.loadUsers();
	}

	openEdit(user: AdminUser) {
		this.editingUser.set(user);
		this.showEditModal.set(true);
	}

	closeEdit() {
		this.showEditModal.set(false);
		this.editingUser.set(null);
	}

	protected onUserEdited(updated: AdminUser) {
		this.users.update(list =>
			list.map(user => (user.id === updated.id ? updated : user))
		);
		this.closeEdit();
	}

	protected onRowAction(user: AdminUser, action: string) {
		switch (action as UserRowAction) {
			case "edit":
				this.openEdit(user);
				return;
			case "premium":
				this.openPremiumAccess(user);
				return;
			case "download-data":
				this.dataActions.downloadData(user);
				return;
			case "delete-account":
				this.dataActions.askDeletion(user);
				return;
		}
	}

	private dataActionItems(user: AdminUser): UiActionMenuItem[] {
		const items: UiActionMenuItem[] = [
			{
				id: "download-data",
				label: "Download data",
				icon: "download",
				hint: "Everything stored for this account, as JSON",
				busy: this.dataActions.downloadingUserId() === user.id,
				separated: true
			}
		];
		if (canDeleteAccount(user))
			items.push({
				id: "delete-account",
				label: "Delete account",
				icon: "delete_forever",
				iconClass: "text-danger",
				hint: "Permanent, can't be undone"
			});
		return items;
	}

	protected onAccountDeleted(user: AdminUser) {
		this.users.update(list => list.filter(item => item.id !== user.id));
		this.total.update(count => Math.max(count - 1, 0));
		this.accountsTotal.update(count => Math.max(count - 1, 0));
		this.dataRequestsPanel().reload();
	}

	protected reloadAfterRequestDeletion() {
		if (this.search())
			this.accountsTotal.update(count => Math.max(count - 1, 0));
		this.loadUsers();
	}

	private actionsFor(user: AdminUser): UiActionMenuItem[] {
		return [
			{ id: "edit", label: "Edit user", icon: "edit" },
			{
				id: "premium",
				label: "Premium access",
				icon: "workspace_premium",
				disabled: this.hasPremiumRole(user),
				hint: this.premiumAccessHint(user) ?? undefined
			},
			{
				id: "profile",
				label: "View profile",
				icon: "account_circle",
				link: { routerLink: ["/user", user.username] }
			},
			...this.dataActionItems(user)
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

	goToOffset(offset: number) {
		this.offset.set(offset);
		this.loadUsers();
	}
}
