import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { map } from "rxjs";
import { environment } from "../../../environments/environment";

export interface CoopMember {
	userId: string;
	username: string;
	name: string;
	avatarUrl: string | null;
	backlogId: string;
	status: string;
	startedAt: string | null;
	finishedAt: string | null;
	realDuration: number | null;
}

export type SyncField =
	| "status"
	| "startedAt"
	| "finishedAt"
	| "realDuration";

interface MembersResponse {
	data: { members: CoopMember[] };
}

interface AddResponse {
	data: { coopRunId: string; targetBacklogId: string };
}

export interface CoopCandidate {
	id: string;
	status: string;
	startedAt: string | null;
	finishedAt: string | null;
	realDuration: number | null;
	coopRunId: string | null;
}

interface CandidatesResponse {
	data: {
		accessible: boolean;
		candidates: CoopCandidate[];
	};
}

@Injectable({ providedIn: "root" })
export class CoopRunsService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/users/me/backlog`;

	getMembers(backlogId: string) {
		return this.http
			.get<MembersResponse>(`${this.baseUrl}/${backlogId}/coop`)
			.pipe(map(res => res.data.members));
	}

	addMember(
		backlogId: string,
		userId: string,
		targetBacklogId?: string
	) {
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
