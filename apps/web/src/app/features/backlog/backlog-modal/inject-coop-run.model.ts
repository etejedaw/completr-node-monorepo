export interface CoopRunOptions {
	entryId: () => string | undefined;
	onSynced: () => void;
}
