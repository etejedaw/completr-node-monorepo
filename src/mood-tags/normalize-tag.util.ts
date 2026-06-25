export function normalizeTag(input: string): string {
	return input
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");
}

export function normalizeTags(input: readonly string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const raw of input) {
		const tag = normalizeTag(raw);
		if (!tag) continue;
		if (tag.length > 40) continue;
		if (seen.has(tag)) continue;
		seen.add(tag);
		out.push(tag);
	}
	return out;
}
