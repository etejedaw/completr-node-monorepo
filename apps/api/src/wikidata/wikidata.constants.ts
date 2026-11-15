export const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";

export const SPARQL_JSON_HEADERS = {
	Accept: "application/sparql-results+json"
};

export const WIKIDATA_HTTP_OPTIONS = {
	minDelayMs: 1000,
	jitterMs: 500,
	backgroundMaxRetryAfterMs: 10 * 60_000
};

export const HLTB_ID_PATTERN = /^\d+$/;

export const SPARQL_STRING_ESCAPES: Record<string, string> = {
	"\\": "\\\\",
	'"': '\\"',
	"\n": "\\n",
	"\r": "\\r",
	"\t": "\\t",
	"\b": "\\b",
	"\f": "\\f"
};

export const SPARQL_STRING_SPECIAL_CHARS = /["\\\n\r\t\b\f]/g;
