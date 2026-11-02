import { type Rewind } from "../../../../core/models/rewind.model";

export interface RewindGenerateFlowOptions {
	username: () => string;
	year: () => number;
	rewind?: () => Rewind | null;
	onGenerated: (rewind: Rewind) => void;
	onFinishedInDialog?: (rewind: Rewind) => void;
}
