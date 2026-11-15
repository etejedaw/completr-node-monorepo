import {
	SPARQL_STRING_ESCAPES,
	SPARQL_STRING_SPECIAL_CHARS
} from "../wikidata.constants";

export function escapeSparqlString(value: string) {
	return value.replace(
		SPARQL_STRING_SPECIAL_CHARS,
		char => SPARQL_STRING_ESCAPES[char] ?? char
	);
}
