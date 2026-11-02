function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findTopLevelValueEnd(text: string, start: number): number {
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let index = start; index < text.length; index++) {
		const character = text[index];
		if (inString) {
			if (escaped) escaped = false;
			else if (character === "\\") escaped = true;
			else if (character === '"') inString = false;
			continue;
		}
		if (character === '"') inString = true;
		else if (character === "{" || character === "[") depth++;
		else if (character === "}" || character === "]") {
			depth--;
			if (depth === 0) return index + 1;
		}
	}
	return -1;
}

function splitConcatenatedValues(text: string): string[] | null {
	const values: string[] = [];
	let cursor = 0;
	while (cursor < text.length) {
		while (cursor < text.length && /\s/.test(text[cursor] ?? "")) cursor++;
		if (cursor >= text.length) break;
		if (text[cursor] !== "{") return null;
		const end = findTopLevelValueEnd(text, cursor);
		if (end === -1) return null;
		values.push(text.slice(cursor, end));
		cursor = end;
	}
	return values.length > 1 ? values : null;
}

function mergeObjects(
	objects: Record<string, unknown>[]
): Record<string, unknown> | null {
	const merged: Record<string, unknown> = {};
	for (const object of objects) {
		for (const [key, value] of Object.entries(object)) {
			if (key in merged) return null;
			merged[key] = value;
		}
	}
	return merged;
}

function parseConcatenatedObjects(text: string): unknown {
	const values = splitConcatenatedValues(text);
	if (values === null) throw new SyntaxError("output is not valid JSON");
	const objects = values.map(value => JSON.parse(value) as unknown);
	if (!objects.every(isPlainObject))
		throw new SyntaxError("output is not valid JSON");
	const merged = mergeObjects(objects);
	if (merged === null) throw new SyntaxError("output is not valid JSON");
	return merged;
}

export function parseJsonOutput(text: string): unknown {
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return parseConcatenatedObjects(text.trim());
	}
}
