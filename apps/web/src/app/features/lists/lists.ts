import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../environments/environment";
import { type FollowingList, type List } from "../../core/models";
import { type Appendable, buildHttpParams } from "../../core/utils/http-params";

interface ListsResponse {
	data: { lists: List[]; total?: number; frozen: boolean };
}

export interface ListsPagination extends Record<string, Appendable> {
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

export interface DuplicateListDto {
	name: string;
	isPublic?: boolean;
}

@Injectable({ providedIn: "root" })
export class ListsService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/lists`;

	getMyLists(pagination: ListsPagination = {}) {
		const params = buildHttpParams(pagination);
		return this.http.get<ListsResponse>(`${this.baseUrl}/me`, { params });
	}

	getOfficial(limit = 12) {
		return this.http
			.get<{
				data: { lists: List[] };
			}>(`${this.baseUrl}/official?limit=${limit}`)
			.pipe(map(res => res.data.lists));
	}

	getRecent(limit = 12) {
		return this.http
			.get<{
				data: { lists: List[] };
			}>(`${this.baseUrl}/recent?limit=${limit}`)
			.pipe(map(res => res.data.lists));
	}

	getById(id: string) {
		return this.http
			.get<ListSingleResponse>(`${this.baseUrl}/${id}`)
			.pipe(map(res => res.data.list));
	}

	getByIdForUser(username: string, id: string) {
		return this.http
			.get<ListSingleResponse>(
				`${environment.apiUrl}/users/${username}/lists/${id}`
			)
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

	duplicate(id: string, dto: DuplicateListDto) {
		return this.http
			.post<ListSingleResponse>(`${this.baseUrl}/${id}/duplicate`, dto)
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

	addItem(listId: string, gameId: string) {
		return this.http.post(`${this.baseUrl}/${listId}/items`, { gameId });
	}

	removeItem(listId: string, gameId: string) {
		return this.http.delete(`${this.baseUrl}/${listId}/items/${gameId}`);
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
