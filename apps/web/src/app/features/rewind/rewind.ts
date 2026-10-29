import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map, type Observable } from "rxjs";

import { environment } from "../../../environments/environment";
import {
	type GenerateRewindRequest,
	type Rewind,
	type RewindYears
} from "../../core/models/rewind.model";

export type RewindImageFormat = "story" | "og";

@Injectable({ providedIn: "root" })
export class RewindService {
	private readonly http = inject(HttpClient);

	getYears(username: string): Observable<RewindYears> {
		return this.http
			.get<{ data: RewindYears }>(rewindsUrl(username))
			.pipe(map(res => res.data));
	}

	getRewind(username: string, year: number): Observable<Rewind> {
		return this.http
			.get<{ data: Rewind }>(`${rewindsUrl(username)}/${year}`)
			.pipe(map(res => res.data));
	}

	generate(year: number, request: GenerateRewindRequest): Observable<Rewind> {
		return this.http
			.post<{ data: Rewind }>(`${ownRewindsUrl()}/${year}`, request)
			.pipe(map(res => res.data));
	}

	addAiRecap(year: number): Observable<Rewind> {
		return this.http
			.post<{ data: Rewind }>(`${ownRewindsUrl()}/${year}/ai-recap`, {})
			.pipe(map(res => res.data));
	}

	getImage(
		username: string,
		year: number,
		format: RewindImageFormat
	): Observable<Blob> {
		return this.http.get(
			`${rewindSharePath(username, year)}/${format}.png`,
			{
				responseType: "blob"
			}
		);
	}
}

export function rewindShareUrl(username: string, year: number): string {
	return `${window.location.origin}${rewindSharePath(username, year)}`;
}

function rewindSharePath(username: string, year: number): string {
	return `/share/rewind/${encodeURIComponent(username)}/${year}`;
}

function rewindsUrl(username: string): string {
	return `${environment.apiUrl}/users/${encodeURIComponent(username)}/rewinds`;
}

function ownRewindsUrl(): string {
	return `${environment.apiUrl}/users/me/rewinds`;
}
