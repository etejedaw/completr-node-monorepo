import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../environments/environment";
import { Appendable, buildHttpParams } from "../../core/utils/http-params";

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

export interface FeedPagination extends Record<string, Appendable> {
	limit?: number;
	offset?: number;
}

@Injectable({ providedIn: "root" })
export class FeedService {
	private readonly http = inject(HttpClient);

	getFeed(pagination: FeedPagination = {}) {
		const params = buildHttpParams(pagination);
		return this.http.get<{
			data: { activities: FeedActivity[]; total: number };
		}>(`${environment.apiUrl}/feed`, { params });
	}

	deleteActivity(id: string) {
		return this.http.delete(`${environment.apiUrl}/feed/${id}`);
	}
}
