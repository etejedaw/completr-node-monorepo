import { type Observable } from "rxjs";

import { type QueueEntry } from "../../../core/models";

export interface QueueWrite {
	request: () => Observable<QueueEntry[]>;
	saved?: () => void;
	failed?: () => void;
}
