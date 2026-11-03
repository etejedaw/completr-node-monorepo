import { type Game } from "../../../core/models";

export type CompilationRowMode = "link" | "create";

export type ManualExternalSource = "hltb" | "metacritic";

export type CompilationRowFocus = "search" | "selected" | null;

export interface CompilationRow {
	id: string;
	mode: CompilationRowMode;
	title: string;
	linkedGame: Game | null;
	focus: CompilationRowFocus;
}
