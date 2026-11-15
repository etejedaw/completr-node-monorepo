import { DestroyRef, inject, signal } from "@angular/core";
import { type Observable, type Subscription } from "rxjs";

import {
	type LatestLoader,
	type LoadHandlers
} from "./inject-latest-loader.model";

export function injectLatestLoader(): LatestLoader {
	const failed = signal(false);
	let current: Subscription | undefined;

	const cancel = () => {
		current?.unsubscribe();
		current = undefined;
	};

	const load = <T>(source: Observable<T>, handlers: LoadHandlers<T>) => {
		cancel();
		failed.set(false);
		current = source.subscribe({
			next: handlers.next,
			error: error => {
				failed.set(true);
				handlers.error?.(error);
			}
		});
	};

	inject(DestroyRef).onDestroy(cancel);

	return { failed: failed.asReadonly(), load, cancel };
}
