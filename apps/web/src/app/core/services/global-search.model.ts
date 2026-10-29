import { type UserResult } from "./users.model";

export interface GameResult {
	id: string;
	title: string;
	code: string;
	backgroundUrl?: string;
}

export interface ListResult {
	id: string;
	name: string;
	description?: string;
}

export interface SearchResults {
	users: UserResult[];
	games: GameResult[];
	lists: ListResult[];
}
