import { QUEUE_LEAVING_STATUSES } from "../backlog.constants";
import { type BacklogStatus } from "../backlog.model";

export function leavesQueue(status: BacklogStatus | undefined) {
	return status !== undefined && QUEUE_LEAVING_STATUSES.includes(status);
}
