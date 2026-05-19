import { inject, Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { environment } from "../../../environments/environment";

export interface ActivityTarget {
	type: "game" | "list" | "user";
	id: string;
	name: string;
	code?: string;
	username?: string;
	backgroundUrl?: string;
	avatarUrl?: string;
}

export interface FeedActivity {
	id: string;
	type: string;
	createdAt: string;
	user: {
		id: string;
		username: string;
		name: string;
		avatarUrl: string | null;
	} | null;
	target: ActivityTarget | null;
}

export interface FeedPagination {
	limit?: number;
	offset?: number;
}

@Injectable({ providedIn: "root" })
export class FeedService {
	private readonly http = inject(HttpClient);

	getFeed(pagination: FeedPagination = {}) {
		let params = new HttpParams();
		if (pagination.limit !== undefined)
			params = params.set("limit", String(pagination.limit));
		if (pagination.offset !== undefined)
			params = params.set("offset", String(pagination.offset));
		return this.http.get<{
			data: { activities: FeedActivity[]; total: number };
		}>(`${environment.apiUrl}/feed`, { params });
	}

	deleteActivity(id: string) {
		return this.http.delete(`${environment.apiUrl}/feed/${id}`);
	}
}
