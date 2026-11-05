const STATUSES_TOASTED_BY_ERROR_INTERCEPTOR: ReadonlySet<number> = new Set([
	402, 409, 422, 429
]);

export function isToastedByErrorInterceptor(status: number): boolean {
	return STATUSES_TOASTED_BY_ERROR_INTERCEPTOR.has(status);
}
