export interface WikidataHltbQuery {
	rawgSlug: string | null;
	title: string;
}

export interface WikidataHltbCandidate {
	hltbId: string;
	label: string | null;
	releaseYear: number | null;
	rawgSlug: string | null;
}
