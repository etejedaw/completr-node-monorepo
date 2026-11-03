import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../environments/environment";
import { type BulkResponse, type BulkResult } from "../../core/models";
import { buildHttpParams } from "../../core/utils/http-params";
import {
	type PlatinumBulkAction,
	type PlatinumBulkRequest,
	type PlatinumListResponse,
	type PlatinumPagination,
	type PlatinumResponse,
	type SavePlatinumDto
} from "./platinum.model";

@Injectable({ providedIn: "root" })
export class PlatinumService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/users/me/games`;

	getMine(pagination: PlatinumPagination = {}) {
		const params = buildHttpParams(pagination);
		return this.http.get<PlatinumListResponse>(
			`${environment.apiUrl}/users/me/platinums`,
			{ params }
		);
	}

	save(gameId: string, dto: SavePlatinumDto) {
		return this.http
			.put<PlatinumResponse>(`${this.baseUrl}/${gameId}/platinum`, dto)
			.pipe(map(res => res.data.platinum));
	}

	remove(gameId: string) {
		return this.http.delete<void>(`${this.baseUrl}/${gameId}/platinum`);
	}

	bulk<TAction extends PlatinumBulkAction>(
		action: TAction,
		body: PlatinumBulkRequest
	) {
		return this.http
			.post<BulkResponse<BulkResult<TAction>>>(
				`${environment.apiUrl}/users/me/platinums/bulk`,
				body,
				{ params: { action } }
			)
			.pipe(map(res => res.data));
	}
}
