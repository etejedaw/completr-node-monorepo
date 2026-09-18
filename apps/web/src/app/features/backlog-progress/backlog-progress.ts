import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../environments/environment";

export interface ProgressNote {
	id: string;
	note: string;
	createdAt: string;
}

interface ProgressResponse {
	data: { progress: ProgressNote[] };
}

interface ProgressEntryResponse {
	data: { progress: ProgressNote };
}

@Injectable({ providedIn: "root" })
export class BacklogProgressService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/users/me/backlog`;

	getProgress(backlogId: string) {
		return this.http
			.get<ProgressResponse>(`${this.baseUrl}/${backlogId}/progress`)
			.pipe(map(res => res.data.progress));
	}

	addProgress(backlogId: string, note: string) {
		return this.http
			.post<ProgressEntryResponse>(
				`${this.baseUrl}/${backlogId}/progress`,
				{ note }
			)
			.pipe(map(res => res.data.progress));
	}

	deleteProgress(backlogId: string, noteId: string) {
		return this.http.delete<void>(
			`${this.baseUrl}/${backlogId}/progress/${noteId}`
		);
	}
}
