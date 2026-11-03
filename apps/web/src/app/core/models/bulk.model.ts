export interface BulkSkippedItem {
	id: string;
	code: string;
}

export interface BulkResult<TAction extends string = string> {
	action: TAction;
	succeeded: string[];
	skipped: BulkSkippedItem[];
}

export interface BulkResponse<TResult extends BulkResult> {
	data: TResult;
}
