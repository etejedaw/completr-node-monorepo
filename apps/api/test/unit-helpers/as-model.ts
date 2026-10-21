export function asModel<T>(value: object): T {
	return value as unknown as T;
}
