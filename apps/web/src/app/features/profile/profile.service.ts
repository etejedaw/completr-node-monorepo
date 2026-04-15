import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map } from "rxjs";
import { environment } from "../../../environments/environment";
import { User } from "../../core/models";

export interface UpdateProfileDto {
	name?: string;
	bio?: string;
	avatarUrl?: string;
	isPublic?: boolean;
	isWishlistPublic?: boolean;
	isFavoritePublic?: boolean;
	isFeedPublic?: boolean;
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
