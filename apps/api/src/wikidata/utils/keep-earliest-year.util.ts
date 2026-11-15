import { type WikidataHltbCandidate } from "../wikidata.interface";

export function keepEarliestYear(
	existing: WikidataHltbCandidate,
	candidate: WikidataHltbCandidate
): WikidataHltbCandidate {
	if (candidate.releaseYear === null) return existing;
	if (
		existing.releaseYear === null ||
		candidate.releaseYear < existing.releaseYear
	)
		return { ...existing, releaseYear: candidate.releaseYear };
	return existing;
}
