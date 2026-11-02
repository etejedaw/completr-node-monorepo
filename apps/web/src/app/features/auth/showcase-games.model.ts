export interface ShowcaseGame {
	id: string;
	code: string;
	title: string;
	backgroundUrl: string;
	releaseYear: number | null;
	genres: string[];
	score: number | null;
	hours: number | null;
	ratio: number | null;
}

export interface ShowcaseGamesResponse {
	data: {
		games: ShowcaseGame[];
	};
}
