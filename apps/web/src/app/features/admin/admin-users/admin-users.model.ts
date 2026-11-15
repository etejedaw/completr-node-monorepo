import { type AdminUser } from "../services/user-admin.model";

export type FormSnapshot = Record<string, unknown>;

export interface AdminUserDataActionCallbacks {
	accountDeleted: (user: AdminUser) => void;
	accountMissing: () => void;
}
