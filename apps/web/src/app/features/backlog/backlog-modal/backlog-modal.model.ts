import { type BacklogEntry, type Game } from "../../../core/models";

export interface BacklogModalData {
	entry: BacklogEntry | null;
	preselectedGame: Game | null;
	preselectedCompilationParent: Game | null;
	preselectAddToQueue: boolean;
	allowNewRun?: boolean;
}
