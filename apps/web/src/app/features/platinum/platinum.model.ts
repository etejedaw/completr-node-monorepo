import { type GamePlatinum, type PlatinumEntry } from "../../core/models";
import { type Appendable } from "../../core/utils/http-params";

export interface PlatinumListResponse {
	data: { platinums: PlatinumEntry[]; total: number };
}

export interface PlatinumPagination extends Record<string, Appendable> {
	limit?: number;
	offset?: number;
	search?: string;
}

export interface PlatinumResponse {
	data: { platinum: GamePlatinum };
}

export interface SavePlatinumDto {
	backlogId?: string | null;
	platformId?: string | null;
	platinumedAt?: string | null;
	notes?: string | null;
}
