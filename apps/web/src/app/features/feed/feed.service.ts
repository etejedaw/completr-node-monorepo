import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map } from "rxjs";
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

@Injectable({ providedIn: "root" })
export class FeedService {
	private readonly http = inject(HttpClient);

	getFeed() {
		return this.http
			.get<{
				data: { activities: FeedActivity[] };
			}>(`${environment.apiUrl}/feed`)
			.pipe(map(res => res.data.activities));
	}

	deleteActivity(id: string) {
		return this.http.delete(`${environment.apiUrl}/feed/${id}`);
	}
}
