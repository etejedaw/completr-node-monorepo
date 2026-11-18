export interface TagAppearance {
	icon: string | null;
	color: string | null;
}

export interface UserTag extends TagAppearance {
	tag: string;
	usageCount: number;
	description: string | null;
	favoriteOrder: number | null;
}

export interface MyTagsResponse {
	data: { tags: UserTag[] };
}

export interface UpdateTagResponse {
	data: { tag: string };
}

export interface UpdateTagDto {
	newTag?: string;
	description?: string | null;
	icon?: string | null;
	color?: string | null;
}

export interface CreateTagDto {
	tag: string;
	description?: string | null;
	icon?: string | null;
	color?: string | null;
}

export interface CreateTagResponse {
	data: TagAppearance & { tag: string; description: string | null };
}

export interface GameTagsResponse {
	data: { tags: string[] };
}

export interface CommunityTag {
	tag: string;
	players: number;
	mine: boolean;
}

export interface CommunityTagsResponse {
	data: { tags: CommunityTag[] };
}

export interface PopularTag {
	tag: string;
	games: number;
	players: number;
}

export interface PopularTagsResponse {
	data: { tags: PopularTag[] };
}

export interface TagGame {
	id: string;
	code: string;
	title: string;
	coverUrl?: string;
	backgroundUrl?: string;
	ratio: number | null;
	players: number;
}

export interface TagGamesPage {
	tag: string;
	total: number;
	games: TagGame[];
}

export interface TagGamesResponse {
	data: TagGamesPage;
}

export interface TagGamesQuery {
	limit: number;
	offset: number;
}

export interface FavoriteTagsResponse {
	data: { tags: string[] };
}
