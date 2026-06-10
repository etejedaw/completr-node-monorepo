// Reverts the HTML-encoding that express-xss-sanitizer applied to req.body
// before the FB-067 fix. Used by the one-off backfill to repair legacy data
// (titles, descriptions, notes, names, bios, etc.) persisted with entities.
//
// `&amp;` is decoded last on purpose: doing it first would over-decode
// single-encoded values (e.g. `&amp;lt;` must become `&lt;`, not `<`).
const ENTITY_REPLACEMENTS: readonly (readonly [RegExp, string])[] = [
	[/&lt;/g, "<"],
	[/&gt;/g, ">"],
	[/&quot;/g, '"'],
	[/&#34;/g, '"'],
	[/&apos;/g, "'"],
	[/&#39;/g, "'"],
	[/&nbsp;/g, " "],
	[/&amp;/g, "&"]
];

export function decodeHtmlEntities(input: string) {
	return ENTITY_REPLACEMENTS.reduce(
		(text, [pattern, replacement]) => text.replace(pattern, replacement),
		input
	);
}
