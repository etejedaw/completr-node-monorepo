import { type BacklogEntry } from "../../core/models";
import {
	type GameResult,
	type ListResult,
	type TagResult
} from "../../core/services/global-search.model";
import { type UserResult } from "../../core/services/users.model";

export type SearchPaletteScope =
	"all" | "library" | "games" | "players" | "lists" | "tags";

interface SearchPaletteLink {
	id: string;
	path: string[];
	queryParams?: Record<string, string>;
}

export type SearchPaletteItem = SearchPaletteLink &
	(
		| { kind: "library"; entry: BacklogEntry }
		| { kind: "library-all"; total: number }
		| { kind: "game"; game: GameResult }
		| { kind: "player"; user: UserResult }
		| { kind: "list"; list: ListResult }
		| { kind: "tag"; tag: TagResult }
		| { kind: "catalog" }
	);

export interface SearchPaletteSection {
	id: string;
	heading: string | null;
	label: string;
	items: SearchPaletteItem[];
}
