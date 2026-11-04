export interface IgdbNamedRef {
	id: number;
	slug: string;
}

export interface IgdbCover {
	id: number;
	image_id: string;
}

export interface IgdbImage {
	id: number;
	image_id: string;
	width?: number;
	height?: number;
}

export interface IgdbArtwork extends IgdbImage {
	image_type?: number;
}

export interface IgdbGameType {
	id: number;
	type: string;
}

export interface IgdbGame {
	id: number;
	name: string;
	slug: string;
	summary?: string;
	first_release_date?: number;
	rating?: number;
	rating_count?: number;
	url?: string;
	game_type?: IgdbGameType;
	cover?: IgdbCover;
	platforms?: IgdbNamedRef[];
	genres?: IgdbNamedRef[];
	themes?: IgdbNamedRef[];
	artworks?: IgdbArtwork[];
	screenshots?: IgdbImage[];
}

export interface IgdbSearchOptions {
	limit?: number;
	mainGamesOnly?: boolean;
}

export interface IgdbTokenResponse {
	access_token: string;
	expires_in: number;
	token_type: string;
}
