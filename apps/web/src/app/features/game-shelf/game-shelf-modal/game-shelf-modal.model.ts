import { type Game, type GameShelfEntry } from "../../../core/models";

export interface GameShelfModalData {
	entry: GameShelfEntry | null;
	preselectedGame: Game | null;
}
