import { type List } from "../../core/models";
import { type Appendable } from "../../core/utils/http-params";

export interface ListsResponse {
	data: { lists: List[]; total?: number; frozen: boolean };
}

export interface ListsPagination extends Record<string, Appendable> {
	limit?: number;
	offset?: number;
}

export interface ListSingleResponse {
	data: { list: List };
}

export interface ListItemsResponse {
	data: { items: List["items"] };
}

export interface RefreshResponse {
	data: { updatedItems: number };
}

export interface GameListsResponse {
	data: GameListsMembership;
}

export interface GameListsMembership {
	lists: {
		id: string;
		name: string;
		description?: string;
		isOfficial: boolean;
		completed: boolean;
		owner: { username: string } | null;
	}[];
	myLists: {
		id: string;
		name: string;
		isPublic: boolean;
		contains: boolean;
	}[];
}

export interface CreateListDto {
	name: string;
	description?: string;
	isPublic?: boolean;
	scoreSource: string;
	durationSource: string;
}

export interface UpdateListDto {
	name?: string;
	description?: string;
	isPublic?: boolean;
	scoreSource?: string;
	durationSource?: string;
}

export interface DuplicateListDto {
	name: string;
	isPublic?: boolean;
}
