import { inject, Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { map } from "rxjs";
import { environment } from "../../../environments/environment";

export interface UserResult {
	id: string;
	username: string;
	name: string;
	avatarUrl: string | null;
	isPublic: boolean;
}

interface UsersResponse {
	data: { users: UserResult[] };
}

@Injectable({ providedIn: "root" })
export class UsersService {
	private readonly http = inject(HttpClient);

	search(opts: { q?: string; email?: string; limit?: number }) {
		let params = new HttpParams();
		if (opts.q) params = params.set("q", opts.q);
		if (opts.email) params = params.set("email", opts.email);
		if (opts.limit) params = params.set("limit", String(opts.limit));
		return this.http
			.get<UsersResponse>(`${environment.apiUrl}/users/search`, { params })
			.pipe(map(res => res.data.users));
	}

	discover(limit = 12) {
		const params = new HttpParams().set("limit", String(limit));
		return this.http
			.get<UsersResponse>(`${environment.apiUrl}/users/discover`, { params })
			.pipe(map(res => res.data.users));
	}
}
