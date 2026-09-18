import { type BacklogProgress } from "./backlog-progress.model";

export function backlogProgressSerializer(entry: BacklogProgress) {
	return {
		id: entry.id,
		note: entry.note,
		createdAt: entry.createdAt
	};
}
