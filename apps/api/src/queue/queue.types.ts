import { type Queue } from "./queue.model";

export type QueueEntryComparator = (a: Queue, b: Queue) => number;
