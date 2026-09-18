import { HttpClient, HttpContext } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../../environments/environment";
import { type User, type VisibilityLevel } from "../../../core/models";
import { buildHttpParams } from "../../../core/utils/http-params";
import { SUPPRESS_VALIDATION_TOAST } from "../../../shared/utils/validation-errors";

const SUPPRESS_TOAST_CONTEXT = new HttpContext().set(
	SUPPRESS_VALIDATION_TOAST,
	true
);

export interface AdminUser {
	id: string;
	username: string;
	email: string;
	name: string;
	role: string;
	isActive: boolean;
	profileVisibility: VisibilityLevel;
	createdAt: string;
}

export interface CreateUserRequest {
	username: string;
	email: string;
	password: string;
	name: string;
	bio?: string;
	avatarUrl?: string;
}

export interface EditUserRequest {
	name?: string;
	password?: string;
	role?: string;
	isActive?: boolean;
}

@Injectable({ providedIn: "root" })
export class UserAdminService {
	private readonly http = inject(HttpClient);

	createUser(data: CreateUserRequest) {
		return this.http
			.post<{
				data: { user: User };
			}>(`${environment.apiUrl}/admin/users`, data, {
				context: SUPPRESS_TOAST_CONTEXT
			})
			.pipe(map(res => res.data.user));
	}

	listUsers(limit = 50, offset = 0) {
		const params = buildHttpParams({ limit, offset });
		return this.http
			.get<{
				data: { users: AdminUser[]; total: number };
			}>(`${environment.apiUrl}/admin/users`, { params })
			.pipe(map(res => res.data));
	}

	editUser(userId: string, data: EditUserRequest) {
		return this.http
			.patch<{
				data: { user: AdminUser };
			}>(`${environment.apiUrl}/admin/users/${userId}`, data, {
				context: SUPPRESS_TOAST_CONTEXT
			})
			.pipe(map(res => res.data.user));
	}
}
