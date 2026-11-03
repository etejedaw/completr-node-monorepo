export interface BulkSkippedItem {
	id: string;
	code: string;
}

export interface BulkResult {
	succeeded: string[];
	skipped: BulkSkippedItem[];
}
