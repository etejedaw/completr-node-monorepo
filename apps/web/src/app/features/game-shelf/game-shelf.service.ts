import { inject, Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { map } from "rxjs";
import { environment } from "../../../environments/environment";
import { GameShelfEntry } from "../../core/models";

interface GameShelfListResponse {
	data: { gameShelf: GameShelfEntry[]; total: number };
}

export interface GameShelfPagination {
	limit?: number;
	offset?: number;
	search?: string;
}

interface GameShelfSingleResponse {
	data: { gameShelf: GameShelfEntry };
}

export interface CreateGameShelfDto {
	gameId: string;
	platformId: string;
	edition?: string;
	acquiredAt?: string;
	notes?: string;
}

export interface UpdateGameShelfDto {
	edition?: string | null;
	acquiredAt?: string | null;
	notes?: string | null;
}

@Injectable({ providedIn: "root" })
export class GameShelfService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/users/me/game-shelf`;

	getMyShelf(pagination: GameShelfPagination = {}) {
		let params = new HttpParams();
		if (pagination.limit !== undefined)
			params = params.set("limit", String(pagination.limit));
		if (pagination.offset !== undefined)
			params = params.set("offset", String(pagination.offset));
		if (pagination.search) params = params.set("search", pagination.search);
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
