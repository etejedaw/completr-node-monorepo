export interface ShowcaseGame {
	id: string;
	code: string;
	title: string;
	coverUrl: string | null;
	backgroundUrl: string | null;
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
