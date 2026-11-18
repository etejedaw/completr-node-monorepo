import { type Observable } from "rxjs";

export interface TagListSyncOptions {
	save: (tags: readonly string[]) => Observable<string[]>;
	failureMessage: string;
	sameList?: (a: readonly string[], b: readonly string[]) => boolean;
	onSaved?: (tags: readonly string[]) => void;
	onFailed?: (error: unknown) => void;
}
