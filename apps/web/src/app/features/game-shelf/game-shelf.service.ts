import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map } from "rxjs";
import { environment } from "../../../environments/environment";
import { GameShelfEntry } from "../../core/models";

interface GameShelfListResponse {
	data: { gameShelf: GameShelfEntry[] };
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

	getMyShelf() {
		return this.http
			.get<GameShelfListResponse>(this.baseUrl)
			.pipe(map(res => res.data.gameShelf));
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
