import { type BacklogEntry } from "../models";
import { type UserResult } from "./users.model";

export interface GameResult {
	id: string;
	title: string;
	code: string;
	coverUrl?: string;
	backgroundUrl?: string;
}

export interface ListResult {
	id: string;
	name: string;
	description?: string;
}

export interface LibraryResults {
	entries: BacklogEntry[];
	total: number;
}

export interface SearchResults {
	library: LibraryResults;
	users: UserResult[];
	games: GameResult[];
	lists: ListResult[];
}
