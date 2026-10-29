import {
	type BacklogEntry,
	type GamePlatinum,
	type Platform
} from "../../../core/models";

export interface PlatinumDialogGame {
	id: string;
	code: string;
	title: string;
	backgroundUrl?: string;
	platforms: Platform[];
}

export interface PlatinumContext {
	game: PlatinumDialogGame;
	runs: BacklogEntry[];
	platinum: GamePlatinum | null;
}

export interface PlatinumDialogData {
	context?: PlatinumContext;
	game?: { id: string; code: string };
}

export type PlatinumDialogResult = { platinum: GamePlatinum } | "removed";
