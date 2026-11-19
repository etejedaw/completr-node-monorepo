import { type ParamMap } from "@angular/router";

import { type ViewSnapshot } from "./backlog-list.model";

export const SAVED_VIEW_PARAM = "savedFilterId";
export const SORT_BY_PARAM = "sort_by";
export const SORT_ORDER_PARAM = "sort_order";
export const DEFAULT_SORT_BY = "createdAt";
export const DEFAULT_SORT_ORDER = "desc";

export const FILTER_PARAMS = [
	"status",
	"platforms",
	"genres",
	"release_year_from",
	"release_year_to",
	"started_from",
	"started_to",
	"finished_from",
	"finished_to",
	"min_rating",
	"max_rating",
	"min_real_duration",
	"max_real_duration",
	"min_ratio",
	"max_ratio",
	"min_personal_ratio",
	"max_personal_ratio",
	"mood_tags",
	"coop_only",
	"platinumed_only"
] as const;

const URL_STATE_PARAMS: readonly string[] = [
	SAVED_VIEW_PARAM,
	...FILTER_PARAMS,
	SORT_BY_PARAM,
	SORT_ORDER_PARAM
];

export type UrlState = Record<string, string | null>;

function asSet(value: string | undefined): string {
	return (value ?? "").split(",").filter(Boolean).sort().join(",");
}

export function sameFilterValue(
	a: string | undefined,
	b: string | undefined
): boolean {
	return asSet(a) === asSet(b);
}

function sameFilters(
	a: Record<string, string>,
	b: Record<string, string>
): boolean {
	return FILTER_PARAMS.every(key => sameFilterValue(a[key], b[key]));
}

export function sameSnapshot(a: ViewSnapshot, b: ViewSnapshot): boolean {
	return (
		sameFilters(a.filters, b.filters) &&
		a.sortBy === b.sortBy &&
		a.sortOrder === b.sortOrder
	);
}

function emptyUrlState(): UrlState {
	return Object.fromEntries(URL_STATE_PARAMS.map(key => [key, null]));
}

export function plainUrlState(snapshot: ViewSnapshot): UrlState {
	const state = emptyUrlState();
	for (const key of FILTER_PARAMS) state[key] = snapshot.filters[key] ?? null;
	if (
		snapshot.sortBy !== DEFAULT_SORT_BY ||
		snapshot.sortOrder !== DEFAULT_SORT_ORDER
	) {
		state[SORT_BY_PARAM] = snapshot.sortBy;
		state[SORT_ORDER_PARAM] = snapshot.sortOrder;
	}
	return state;
}

export function viewUrlState(
	viewId: string,
	viewIsDefault: boolean,
	current: ViewSnapshot,
	baseline: ViewSnapshot
): UrlState {
	const state = emptyUrlState();
	let overridden = false;
	for (const key of FILTER_PARAMS) {
		if (sameFilterValue(current.filters[key], baseline.filters[key]))
			continue;
		state[key] = current.filters[key] ?? "";
		overridden = true;
	}
	if (
		current.sortBy !== baseline.sortBy ||
		current.sortOrder !== baseline.sortOrder
	) {
		state[SORT_BY_PARAM] = current.sortBy;
		state[SORT_ORDER_PARAM] = current.sortOrder;
		overridden = true;
	}
	if (overridden || !viewIsDefault) state[SAVED_VIEW_PARAM] = viewId;
	return state;
}

export function readUrlState(params: ParamMap): UrlState {
	return Object.fromEntries(
		URL_STATE_PARAMS.map(key => [key, params.get(key)])
	);
}

export function urlStateKey(state: UrlState): string {
	return JSON.stringify(URL_STATE_PARAMS.map(key => state[key] ?? null));
}

export function differsOnlyInUrlState(
	previous: ParamMap,
	next: ParamMap
): boolean {
	const keys = new Set([...previous.keys, ...next.keys]);
	return [...keys].every(
		key =>
			URL_STATE_PARAMS.includes(key) ||
			JSON.stringify(previous.getAll(key)) ===
				JSON.stringify(next.getAll(key))
	);
}

export function hasFilterParams(params: ParamMap): boolean {
	return (
		FILTER_PARAMS.some(key => params.has(key)) ||
		params.has(SORT_BY_PARAM) ||
		params.has(SORT_ORDER_PARAM)
	);
}

export function overlayFilterParams(
	filters: Record<string, string>,
	params: ParamMap
): Record<string, string> {
	const overridden = new Set<string>(
		FILTER_PARAMS.filter(key => params.has(key))
	);
	if (overridden.has("platforms")) overridden.add("platform_id");
	const merged = Object.entries(filters).filter(
		([key]) => !overridden.has(key)
	);
	for (const key of FILTER_PARAMS) {
		const value = params.get(key)?.trim();
		if (value) merged.push([key, value]);
	}
	return Object.fromEntries(merged);
}
