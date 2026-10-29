import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../environments/environment";
import { buildHttpParams } from "../utils/http-params";
import { type UsersResponse } from "./users.model";

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
