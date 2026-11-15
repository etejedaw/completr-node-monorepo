import { type WikidataHltbQuery } from "../wikidata.interface";
import { escapeSparqlString } from "./escape-sparql-string.util";

export function buildHltbCandidatesQuery({
	rawgSlug,
	title
}: WikidataHltbQuery): string | null {
	const slug = rawgSlug?.trim();
	const label = title.trim();
	const branches = [
		...(slug ? [`?item wdt:P9968 "${escapeSparqlString(slug)}" .`] : []),
		...(label
			? [`?item rdfs:label "${escapeSparqlString(label)}"@en .`]
			: [])
	];
	if (branches.length === 0) return null;

	return [
		"SELECT ?item ?hltbId ?label ?rawgSlug ?publication WHERE {",
		`  ${branches.map(branch => `{ ${branch} }`).join(" UNION ")}`,
		"  ?item wdt:P2816 ?hltbId .",
		'  OPTIONAL { ?item rdfs:label ?label . FILTER(LANG(?label) = "en") }',
		"  OPTIONAL { ?item wdt:P9968 ?rawgSlug . }",
		"  OPTIONAL { ?item wdt:P577 ?publication . }",
		"}"
	].join("\n");
}
