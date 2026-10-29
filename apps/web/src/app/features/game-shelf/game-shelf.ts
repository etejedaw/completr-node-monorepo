import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../environments/environment";
import { buildHttpParams } from "../../core/utils/http-params";
import {
	type CreateGameShelfDto,
	type GameShelfListResponse,
	type GameShelfPagination,
	type GameShelfSingleResponse,
	type UpdateGameShelfDto
} from "./game-shelf.model";

@Injectable({ providedIn: "root" })
export class GameShelfService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/users/me/game-shelf`;

	getMyShelf(pagination: GameShelfPagination = {}) {
		const params = buildHttpParams(pagination);
		return this.http.get<GameShelfListResponse>(this.baseUrl, { params });
	}

	create(dto: CreateGameShelfDto) {
		return this.http
			.post<GameShelfSingleResponse>(this.baseUrl, dto)
			.pipe(map(res => res.data.gameShelf));
	}

	update(id: string, dto: UpdateGameShelfDto) {
		return this.http
			.patch<GameShelfSingleResponse>(`${this.baseUrl}/${id}`, dto)
			.pipe(map(res => res.data.gameShelf));
	}

	delete(id: string) {
		return this.http.delete(`${this.baseUrl}/${id}`);
	}
}
