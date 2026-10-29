import { type FavoriteEntry } from "../../core/models";
import { type Appendable } from "../../core/utils/http-params";

export interface FavoritesResponse {
	data: { favorites: FavoriteEntry[]; total?: number };
}

export interface FavoriteGameIdsResponse {
	data: { gameIds: string[] };
}

export interface FavoritesPagination extends Record<string, Appendable> {
	limit?: number;
	offset?: number;
	search?: string;
}
