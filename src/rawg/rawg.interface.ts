export interface RawgGameSearchResult {
	id: number;
	slug: string;
	name: string;
	released: string | null;
	background_image: string | null;
	metacritic: number | null;
	rating: number;
	playtime: number;
	genres: RawgGenre[];
	tags: RawgTag[];
	platforms: RawgPlatformWrapper[];
}

export interface RawgGameDetail extends RawgGameSearchResult {
	description_raw: string | null;
	website: string | null;
}

export interface RawgGenre {
	id: number;
	name: string;
	slug: string;
}

export interface RawgTag {
	id: number;
	name: string;
	slug: string;
	language?: string;
}

export interface RawgPlatformWrapper {
	platform: {
		id: number;
		name: string;
		slug: string;
	};
}

export interface RawgSearchResponse {
	count: number;
	next: string | null;
	results: RawgGameSearchResult[];
}

export interface RawgSearchFilters {
	page_size?: number;
	dates?: string;
	platforms?: string;
	genres?: string;
	metacritic?: string;
	ordering?: string;
	search_exact?: boolean;
	exclude_additions?: boolean;
}
