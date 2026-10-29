import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../environments/environment";
import { type User } from "../../core/models";
import { type UpdateProfileDto } from "./profile.model";

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
