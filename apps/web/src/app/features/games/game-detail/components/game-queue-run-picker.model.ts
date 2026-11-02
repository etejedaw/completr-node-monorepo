import { type QueueableRun } from "../queue-intent.model";

export interface GameQueueRunPickerData {
	gameTitle: string;
	runs: QueueableRun[];
}
