import { type AdminUser } from "../services/user-admin.model";

export interface CreateUserRequest {
	username: string;
	email: string;
	password: string;
	name: string;
}

export interface AdminUserDataActionCallbacks {
	accountDeleted: (user: AdminUser) => void;
	accountMissing: () => void;
}
