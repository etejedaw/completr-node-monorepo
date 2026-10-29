import { type WishlistEntry } from "../../core/models";
import { type Appendable } from "../../core/utils/http-params";

export interface WishlistResponse {
	data: { wishlist: WishlistEntry[]; total?: number };
}

export interface WishlistAddResponse {
	data: { wishlist: WishlistEntry };
}

export interface WishlistGameIdsResponse {
	data: { gameIds: string[] };
}

export interface WishlistPagination extends Record<string, Appendable> {
	limit?: number;
	offset?: number;
	search?: string;
}
