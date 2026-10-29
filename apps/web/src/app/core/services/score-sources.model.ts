export interface ScoreSourceInfo {
	code: string;
	name: string;
	scale: number;
	priority: number;
}

export interface ScoreSourcesResponse {
	data: { sources: ScoreSourceInfo[] };
}
