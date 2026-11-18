import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../environments/environment";
import {
	type CommunityTagsResponse,
	type CreateTagDto,
	type CreateTagResponse,
	type FavoriteTagsResponse,
	type GameTagsResponse,
	type MyTagsResponse,
	type PopularTagsResponse,
	type TagGamesQuery,
	type TagGamesResponse,
	type UpdateTagDto,
	type UpdateTagResponse
} from "./mood-tags.model";

const POPULAR_TAGS_DEFAULT_LIMIT = 20;
const TAG_SEARCH_DEFAULT_LIMIT = 10;

@Injectable({ providedIn: "root" })
export class MoodTagsService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/users/me`;
	private readonly apiUrl = environment.apiUrl;

	getMyTags() {
		return this.http
			.get<MyTagsResponse>(`${this.baseUrl}/mood-tags`)
			.pipe(map(res => res.data.tags));
	}

	getGameTags(gameId: string) {
		return this.http
			.get<GameTagsResponse>(`${this.baseUrl}/games/${gameId}/mood-tags`)
			.pipe(map(res => res.data.tags));
	}

	replaceGameTags(gameId: string, tags: string[]) {
		return this.http
			.put<GameTagsResponse>(
				`${this.baseUrl}/games/${gameId}/mood-tags`,
				{ tags }
			)
			.pipe(map(res => res.data.tags));
	}

	updateTag(tag: string, dto: UpdateTagDto) {
		return this.http
			.patch<UpdateTagResponse>(
				`${this.baseUrl}/mood-tags/${encodeURIComponent(tag)}`,
				dto
			)
			.pipe(map(res => res.data.tag));
	}

	deleteTag(tag: string) {
		return this.http.delete<void>(
			`${this.baseUrl}/mood-tags/${encodeURIComponent(tag)}`
		);
	}

	createTag(dto: CreateTagDto) {
		return this.http
			.post<CreateTagResponse>(`${this.baseUrl}/mood-tags`, dto)
			.pipe(map(res => res.data));
	}

	replaceFavoriteTags(tags: readonly string[]) {
		return this.http
			.put<FavoriteTagsResponse>(`${this.baseUrl}/mood-tags/favorites`, {
				tags
			})
			.pipe(map(res => res.data.tags));
	}

	getCommunityTags(gameId: string) {
		return this.http
			.get<CommunityTagsResponse>(`${this.apiUrl}/games/${gameId}/tags`)
			.pipe(map(res => res.data.tags));
	}

	getPopularTags(limit = POPULAR_TAGS_DEFAULT_LIMIT) {
		return this.http
			.get<PopularTagsResponse>(`${this.apiUrl}/tags/popular`, {
				params: new HttpParams().set("limit", limit)
			})
			.pipe(map(res => res.data.tags));
	}

	searchTags(search: string, limit = TAG_SEARCH_DEFAULT_LIMIT) {
		return this.http
			.get<PopularTagsResponse>(`${this.apiUrl}/tags/search`, {
				params: new HttpParams()
					.set("search", search)
					.set("limit", limit)
			})
			.pipe(map(res => res.data.tags));
	}

	getTagGames(tag: string, query: TagGamesQuery) {
		return this.http
			.get<TagGamesResponse>(
				`${this.apiUrl}/tags/${encodeURIComponent(tag)}/games`,
				{
					params: new HttpParams()
						.set("limit", query.limit)
						.set("offset", query.offset)
				}
			)
			.pipe(map(res => res.data));
	}
}
