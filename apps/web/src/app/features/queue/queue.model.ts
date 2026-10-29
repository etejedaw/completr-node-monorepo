import { type QueueEntry } from "../../core/models";
import { type Appendable } from "../../core/utils/http-params";

export interface QueueListResponse {
	data: { queue: QueueEntry[]; total?: number };
}

export interface QueueSingleResponse {
	data: { queue: QueueEntry };
}

export interface QueueBacklogIdsResponse {
	data: { backlogIds: string[] };
}

export interface QueuePagination extends Record<string, Appendable> {
	limit?: number;
	offset?: number;
	search?: string;
}
