import { HttpParams } from "@angular/common/http";

type Primitive = string | number | boolean;

export type Appendable = Primitive | Primitive[] | null | undefined;

export function buildHttpParams<T extends Record<string, Appendable>>(
	source: T | null | undefined
): HttpParams {
	let params = new HttpParams();
	if (!source) return params;

	for (const [key, raw] of Object.entries(source)) {
		params = appendValue(params, key, raw);
	}

	return params;
}

function appendValue(
	params: HttpParams,
	key: string,
	raw: Appendable
): HttpParams {
	if (Array.isArray(raw)) {
		return raw
			.filter(isAppendable)
			.reduce((acc, item) => acc.append(key, item), params);
	}

	return isAppendable(raw) ? params.set(key, raw) : params;
}

function isAppendable(value: unknown): value is Primitive {
	if (value === undefined || value === null || value === "") return false;
	return (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	);
}
