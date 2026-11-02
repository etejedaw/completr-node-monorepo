import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../environments/environment";
import {
	type AddResponse,
	type CandidatesResponse,
	type MembersResponse
} from "./coop-runs.model";

export type SyncField = "status" | "startedAt" | "finishedAt" | "realDuration";

@Injectable({ providedIn: "root" })
export class CoopRunsService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/users/me/backlog`;

	getMembers(backlogId: string) {
		return this.http
			.get<MembersResponse>(`${this.baseUrl}/${backlogId}/coop`)
			.pipe(map(res => res.data.members));
	}

	addMember(backlogId: string, userId: string, targetBacklogId?: string) {
		return this.http
			.post<AddResponse>(`${this.baseUrl}/${backlogId}/coop`, {
				userId,
				...(targetBacklogId ? { targetBacklogId } : {})
			})
			.pipe(map(res => res.data));
	}

	getCandidates(backlogId: string, userId: string) {
		return this.http
			.get<CandidatesResponse>(
				`${this.baseUrl}/${backlogId}/coop/candidates?userId=${userId}`
			)
			.pipe(map(res => res.data));
	}

	removeMember(backlogId: string, userId: string) {
		return this.http.delete<void>(
			`${this.baseUrl}/${backlogId}/coop/${userId}`
		);
	}

	sync(backlogId: string, fromBacklogId: string, fields: SyncField[]) {
		return this.http.post<void>(`${this.baseUrl}/${backlogId}/coop/sync`, {
			fromBacklogId,
			fields
		});
	}
}
