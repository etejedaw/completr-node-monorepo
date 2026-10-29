export interface PendingRemoval<T> {
	item: T;
	previousKey: string | null;
}
