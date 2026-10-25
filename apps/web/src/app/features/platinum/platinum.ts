import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../environments/environment";
import { type GamePlatinum } from "../../core/models";

interface PlatinumResponse {
	data: { platinum: GamePlatinum };
}

export interface SavePlatinumDto {
	backlogId?: string | null;
	platformId?: string | null;
	platinumedAt?: string | null;
	notes?: string | null;
}

@Injectable({ providedIn: "root" })
export class PlatinumService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/users/me/games`;

	save(gameId: string, dto: SavePlatinumDto) {
		return this.http
			.put<PlatinumResponse>(`${this.baseUrl}/${gameId}/platinum`, dto)
			.pipe(map(res => res.data.platinum));
	}

	remove(gameId: string) {
		return this.http.delete<void>(`${this.baseUrl}/${gameId}/platinum`);
	}
}
