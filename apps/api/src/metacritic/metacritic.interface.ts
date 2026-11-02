export interface MetacriticGameDetail {
	slug: string;
	title: string;
	releaseYear: number | null;
	platforms: string[];
	metaScore: number | null;
	userScore: number | null;
}

export interface MetacriticScoreLabel {
	prefix: RegExp;
	value: RegExp;
	max: number;
}
