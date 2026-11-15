import { type Observable } from "rxjs";

export interface ToggleActionRequest {
	key: string;
	request: Observable<unknown>;
	failureMessage: string;
	missingMessage?: string;
	onSuccess?: () => void;
	onMissing?: () => void;
}
