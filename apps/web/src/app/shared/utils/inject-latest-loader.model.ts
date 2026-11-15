import { type Signal } from "@angular/core";
import { type Observable } from "rxjs";

export interface LoadHandlers<T> {
	next: (value: T) => void;
	error?: (error: unknown) => void;
}

export interface LatestLoader {
	readonly failed: Signal<boolean>;
	load: <T>(source: Observable<T>, handlers: LoadHandlers<T>) => void;
	cancel: () => void;
}
