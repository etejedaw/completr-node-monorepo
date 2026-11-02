import { type Game } from "../../../core/models";

export type CompilationRowMode = "link" | "create";

export type ManualExternalSource = "hltb" | "metacritic";

export interface CompilationRow {
	id: string;
	mode: CompilationRowMode;
	title: string;
	linkedGame: Game | null;
	searchQuery: string;
	searching: boolean;
	searchResults: Game[];
}
