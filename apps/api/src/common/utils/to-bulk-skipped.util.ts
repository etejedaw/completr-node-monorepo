import { type BulkSkippedItem } from "../interfaces/bulk-result.interface";

export function toBulkSkipped(ids: string[], code: string): BulkSkippedItem[] {
	return ids.map(id => ({ id, code }));
}
