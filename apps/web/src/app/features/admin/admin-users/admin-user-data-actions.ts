import { type HttpErrorResponse } from "@angular/common/http";
import { inject, signal } from "@angular/core";

import { ToastService } from "../../../core/services/toast";
import { adminErrorMessage } from "../../../core/utils/admin-error-message";
import { isToastedByErrorInterceptor } from "../../../core/utils/toasted-error-statuses";
import { DataRequestAdminService } from "../services/data-request-admin.service";
import { type AdminUser } from "../services/user-admin.model";
import { type AdminUserDataActionCallbacks } from "./admin-users.model";

const PROTECTED_ROLE = "admin";

export function canDeleteAccount(user: AdminUser): boolean {
	return user.role !== PROTECTED_ROLE;
}

export function injectAdminUserDataActions(
	callbacks: AdminUserDataActionCallbacks
) {
	const dataRequestAdminService = inject(DataRequestAdminService);
	const toast = inject(ToastService);

	const downloadingUserId = signal<string | null>(null);
	const accountToDelete = signal<AdminUser | null>(null);
	const deletingAccount = signal(false);

	function notifyFailure(error: HttpErrorResponse, fallback: string) {
		if (!isToastedByErrorInterceptor(error.status))
			toast.error(adminErrorMessage(error) ?? fallback);
		if (error.status === 404) callbacks.accountMissing();
	}

	function downloadData(user: AdminUser) {
		if (downloadingUserId()) return;
		downloadingUserId.set(user.id);
		dataRequestAdminService
			.downloadUserData(user.id, user.username)
			.subscribe({
				next: () => downloadingUserId.set(null),
				error: (error: HttpErrorResponse) => {
					downloadingUserId.set(null);
					notifyFailure(
						error,
						`Could not download the data of ${user.username}.`
					);
				}
			});
	}

	function askDeletion(user: AdminUser) {
		if (!canDeleteAccount(user)) return;
		accountToDelete.set(user);
	}

	function cancelDeletion() {
		if (deletingAccount()) return;
		accountToDelete.set(null);
	}

	function confirmDeletion() {
		const user = accountToDelete();
		if (!user || deletingAccount()) return;
		deletingAccount.set(true);
		dataRequestAdminService.deleteUser(user.id).subscribe({
			next: () => {
				deletingAccount.set(false);
				accountToDelete.set(null);
				toast.success(`Account ${user.username} deleted.`);
				callbacks.accountDeleted(user);
			},
			error: (error: HttpErrorResponse) => {
				deletingAccount.set(false);
				accountToDelete.set(null);
				notifyFailure(
					error,
					`Could not delete the account of ${user.username}.`
				);
			}
		});
	}

	return {
		downloadingUserId: downloadingUserId.asReadonly(),
		accountToDelete: accountToDelete.asReadonly(),
		deletingAccount: deletingAccount.asReadonly(),
		downloadData,
		askDeletion,
		cancelDeletion,
		confirmDeletion
	};
}
