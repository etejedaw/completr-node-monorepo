import { type BacklogEntry } from "../../../core/models";

export interface QueueableRun {
	run: BacklogEntry;
	number: number;
}

export type QueueIntent =
	| { kind: "newRun" }
	| { kind: "direct"; run: BacklogEntry }
	| { kind: "pick"; runs: QueueableRun[] };
