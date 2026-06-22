import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map, switchMap } from "rxjs";
import { environment } from "../../../environments/environment";
import { QueueEntry } from "../../core/models";
import { Appendable, buildHttpParams } from "../../core/utils/http-params";

interface QueueListResponse {
	data: { queue: QueueEntry[]; total?: number };
}

interface QueueSingleResponse {
	data: { queue: QueueEntry };
}

export interface QueuePagination extends Record<string, Appendable> {
	limit?: number;
	offset?: number;
	search?: string;
}

@Injectable({ providedIn: "root" })
export class QueueService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/users/me/queue`;

	getMyQueue(pagination: QueuePagination = {}) {
		const params = buildHttpParams(pagination);
		return this.http
			.get<QueueListResponse>(this.baseUrl, { params })
			.pipe(map(res => res.data.queue));
	}

	getMyQueuePaged(pagination: QueuePagination = {}) {
		const params = buildHttpParams(pagination);
		return this.http.get<QueueListResponse>(this.baseUrl, { params });
	}

	addFromGame(gameId: string, platformId: string) {
		return this.http
			.post<QueueSingleResponse>(`${this.baseUrl}?source=game`, {
				id: gameId,
				platformId
			})
			.pipe(map(res => res.data.queue));
	}

	addFromBacklog(backlogId: string) {
		return this.http
			.post<QueueSingleResponse>(`${this.baseUrl}?source=backlog`, {
				id: backlogId
			})
			.pipe(map(res => res.data.queue));
	}

	reorder(backlogIds: string[]) {
		return this.http
			.put<QueueListResponse>(this.baseUrl, { backlogIds })
			.pipe(map(res => res.data.queue));
	}

	removeByBacklogId(backlogId: string) {
		return this.getMyQueue().pipe(
			map(entries =>
				entries
					.filter(e => e.backlog.id !== backlogId)
					.map(e => e.backlog.id)
			),
			switchMap(remaining =>
				this.http
					.put<QueueListResponse>(this.baseUrl, { backlogIds: remaining })
					.pipe(map(res => res.data.queue))
			)
		);
	}
}
