import { type MetacriticSlugCandidate } from "../games-external-data.interface";
import { deriveMetacriticSlug } from "./derive-metacritic-slug.util";

export function buildMetacriticSlugCandidates(
	title: string,
	variant?: string | null
): MetacriticSlugCandidate[] {
	const titles = variant?.trim()
		? [`${title} ${variant.trim()}`, title]
		: [title];
	const candidates = titles
		.map(candidateTitle => ({
			slug: deriveMetacriticSlug(candidateTitle),
			title: candidateTitle
		}))
		.filter(candidate => candidate.slug.length > 0);
	return candidates.filter(
		(candidate, index) =>
			candidates.findLastIndex(other => other.slug === candidate.slug) ===
			index
	);
}
