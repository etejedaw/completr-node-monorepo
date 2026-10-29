export type JsonOutcome<T> =
	{ ok: true; data: T } | { ok: false; reason: string };
