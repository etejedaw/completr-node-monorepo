import { type Appendable } from "../../core/utils/http-params";

export interface ActivityTarget {
	type: "game" | "list" | "user";
	id: string;
	name: string;
	code?: string;
	username?: string;
	backgroundUrl?: string;
	avatarUrl?: string;
	role?: string;
}

export interface FeedActivity {
	id: string;
	type: string;
	createdAt: string;
	user: {
		id: string;
		username: string;
		name: string;
		avatarUrl: string | null;
		role?: string;
	} | null;
	target: ActivityTarget | null;
	game: ActivityTarget | null;
}

export type FeedCategory = "games" | "lists" | "social";

export interface FeedPagination extends Record<string, Appendable> {
	limit?: number;
	offset?: number;
	category?: FeedCategory;
	types?: string;
}
