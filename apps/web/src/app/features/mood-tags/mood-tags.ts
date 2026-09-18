import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../environments/environment";

export interface UserTag {
	tag: string;
	usageCount: number;
	description: string | null;
}

interface MyTagsResponse {
	data: { tags: UserTag[] };
}

interface UpdateTagResponse {
	data: { tag: string };
}

export interface UpdateTagDto {
	newTag?: string;
	description?: string | null;
}

export interface CreateTagDto {
	tag: string;
	description?: string | null;
}

interface CreateTagResponse {
	data: { tag: string; description: string | null };
}

interface GameTagsResponse {
	data: { tags: string[] };
}

@Injectable({ providedIn: "root" })
export class MoodTagsService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/users/me`;

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
}
