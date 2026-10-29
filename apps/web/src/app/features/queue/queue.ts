import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map, switchMap } from "rxjs";

import { environment } from "../../../environments/environment";
import { buildHttpParams } from "../../core/utils/http-params";
import { moveIntoFullOrder } from "../../shared/utils/full-order";
import {
	type QueueBacklogIdsResponse,
	type QueueListResponse,
	type QueuePagination,
	type QueueSingleResponse
} from "./queue.model";

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

	getMyQueueBacklogIds() {
		return this.http
			.get<QueueBacklogIdsResponse>(`${this.baseUrl}/backlog-ids`)
			.pipe(map(res => res.data.backlogIds));
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

	updateOrder(change: (backlogIds: string[]) => string[]) {
		return this.getMyQueueBacklogIds().pipe(
			map(change),
			switchMap(backlogIds => this.reorder(backlogIds))
		);
	}

	moveToPosition(backlogId: string, position: number) {
		return this.http
			.patch<QueueListResponse>(`${this.baseUrl}/${backlogId}/position`, {
				position
			})
			.pipe(map(res => res.data.queue));
	}

	moveWithinVisible(backlogId: string, visibleOrder: readonly string[]) {
		return this.getMyQueueBacklogIds().pipe(
			map(ids => {
				const arranged = moveIntoFullOrder(
					ids,
					backlogId,
					visibleOrder
				);
				return arranged.indexOf(backlogId) + 1;
			}),
			switchMap(position => this.moveToPosition(backlogId, position))
		);
	}

	moveToTop(backlogId: string) {
		return this.moveToPosition(backlogId, 1);
	}

	removeByBacklogId(backlogId: string) {
		return this.updateOrder(ids => ids.filter(id => id !== backlogId));
	}
}
