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
