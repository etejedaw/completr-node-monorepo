import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map } from "rxjs";
import { environment } from "../../../environments/environment";
import { VisibilityLevel } from "../models/user.model";
import { buildHttpParams } from "../utils/http-params";

export interface UserResult {
	id: string;
	username: string;
	name: string;
	avatarUrl: string | null;
	profileVisibility: VisibilityLevel;
}

interface UsersResponse {
	data: { users: UserResult[] };
}

@Injectable({ providedIn: "root" })
export class UsersService {
	private readonly http = inject(HttpClient);

	search(opts: { q?: string; email?: string; limit?: number }) {
		const params = buildHttpParams(opts);
		return this.http
			.get<UsersResponse>(`${environment.apiUrl}/users/search`, {
				params
			})
			.pipe(map(res => res.data.users));
	}

	discover(limit = 12) {
		const params = buildHttpParams({ limit });
		return this.http
			.get<UsersResponse>(`${environment.apiUrl}/users/discover`, {
				params
			})
			.pipe(map(res => res.data.users));
	}
}
