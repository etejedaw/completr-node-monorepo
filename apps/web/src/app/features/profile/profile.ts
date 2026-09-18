import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../environments/environment";
import { type User, type VisibilityLevel } from "../../core/models";

export interface UpdateProfileDto {
	name?: string;
	bio?: string;
	avatarUrl?: string;
	profileVisibility?: VisibilityLevel;
	queueVisibility?: VisibilityLevel;
	wishlistVisibility?: VisibilityLevel;
	favoriteVisibility?: VisibilityLevel;
	feedVisibility?: VisibilityLevel;
	backlogVisibility?: VisibilityLevel;
	shelfVisibility?: VisibilityLevel;
	listVisibility?: VisibilityLevel;
	acceptFollowRequests?: boolean;
}

@Injectable({ providedIn: "root" })
export class ProfileService {
	private readonly http = inject(HttpClient);

	update(dto: UpdateProfileDto) {
		return this.http
			.patch<{
				data: { user: User };
			}>(`${environment.apiUrl}/users/me`, dto)
			.pipe(map(res => res.data.user));
	}
}
