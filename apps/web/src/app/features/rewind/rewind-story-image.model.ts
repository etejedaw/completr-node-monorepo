import { type Signal } from "@angular/core";

export interface RewindShareTarget {
	username: string;
	year: number;
}

export interface RewindStoryImage {
	readonly target: Signal<RewindShareTarget | null>;
	readonly blob: Signal<Blob | null>;
	readonly objectUrl: Signal<string | null>;
	readonly isLoading: Signal<boolean>;
	readonly hasError: Signal<boolean>;
	request(): void;
	retry(): void;
}
