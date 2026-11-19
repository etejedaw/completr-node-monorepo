import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../environments/environment";
import {
	type PublicFavoriteTagsResponse,
	type PublicProfile
} from "./public-profile.model";

@Injectable({ providedIn: "root" })
export class PublicProfileService {
	private readonly http = inject(HttpClient);

	getProfile(username: string) {
		return this.http
			.get<{
				data: PublicProfile;
			}>(`${environment.apiUrl}/users/${username}`)
			.pipe(map(res => res.data));
	}

	getFavoriteTags(username: string) {
		return this.http
			.get<PublicFavoriteTagsResponse>(
				`${environment.apiUrl}/users/${encodeURIComponent(username)}/tags`
			)
			.pipe(map(res => res.data.tags));
	}
}
