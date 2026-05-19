import { inject, Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { map } from "rxjs";
import { environment } from "../../../environments/environment";
import { List, FollowingList } from "../../core/models";

interface ListsResponse {
	data: { lists: List[]; total?: number; frozen: boolean };
}

export interface ListsPagination {
	limit?: number;
	offset?: number;
}

interface ListSingleResponse {
	data: { list: List };
}

interface ListItemsResponse {
	data: { items: List["items"] };
}

interface RefreshResponse {
	data: { updatedItems: number };
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

@Injectable({ providedIn: "root" })
export class ListsService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/lists`;

	getMyLists(pagination: ListsPagination = {}) {
		let params = new HttpParams();
		if (pagination.limit !== undefined)
			params = params.set("limit", String(pagination.limit));
		if (pagination.offset !== undefined)
			params = params.set("offset", String(pagination.offset));
		return this.http.get<ListsResponse>(`${this.baseUrl}/me`, { params });
	}

	getOfficial(limit = 12) {
		return this.http
			.get<{ data: { lists: List[] } }>(`${this.baseUrl}/official?limit=${limit}`)
			.pipe(map(res => res.data.lists));
	}

	getRecent(limit = 12) {
		return this.http
			.get<{ data: { lists: List[] } }>(`${this.baseUrl}/recent?limit=${limit}`)
			.pipe(map(res => res.data.lists));
	}

	getById(id: string) {
		return this.http
			.get<ListSingleResponse>(`${this.baseUrl}/${id}`)
			.pipe(map(res => res.data.list));
	}

	create(dto: CreateListDto) {
		return this.http
			.post<ListSingleResponse>(this.baseUrl, dto)
			.pipe(map(res => res.data.list));
	}

	update(id: string, dto: UpdateListDto) {
		return this.http
			.patch<ListSingleResponse>(`${this.baseUrl}/${id}`, dto)
			.pipe(map(res => res.data.list));
	}

	delete(id: string) {
		return this.http.delete(`${this.baseUrl}/${id}`);
	}

	replaceItems(id: string, gameIds: string[]) {
		return this.http
			.put<ListItemsResponse>(`${this.baseUrl}/${id}/items`, {
				gameIds
			})
			.pipe(map(res => res.data.items));
	}

	refreshScores(id: string) {
		return this.http
			.post<RefreshResponse>(`${this.baseUrl}/${id}/refresh-scores`, {})
			.pipe(map(res => res.data.updatedItems));
	}

	follow(id: string) {
		return this.http.post(
			`${this.baseUrl}/${id}/follow`,
			{},
			{
				responseType: "text"
			}
		);
	}

	unfollow(id: string) {
		return this.http.delete(`${this.baseUrl}/${id}/follow`);
	}

	search(query: string) {
		return this.http
			.get<{
				data: { lists: List[] };
			}>(`${this.baseUrl}/search?query=${encodeURIComponent(query)}`)
			.pipe(map(res => res.data.lists));
	}

	getFollowing() {
		return this.http
			.get<{
				data: { lists: FollowingList[] };
			}>(`${this.baseUrl}/following`)
			.pipe(map(res => res.data.lists));
	}
}
