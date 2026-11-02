import { type GameShelfEntry } from "../../core/models";
import { type Appendable } from "../../core/utils/http-params";

export interface GameShelfListResponse {
	data: { gameShelf: GameShelfEntry[]; total: number };
}

export interface GameShelfPagination extends Record<string, Appendable> {
	limit?: number;
	offset?: number;
	search?: string;
}

export interface GameShelfSingleResponse {
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
