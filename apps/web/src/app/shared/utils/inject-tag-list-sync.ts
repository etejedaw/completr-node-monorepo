import { computed, DestroyRef, inject, signal } from "@angular/core";

import { ToastService } from "../../core/services/toast";
import { reportHttpFailure } from "./http-failure";
import { type TagListSyncOptions } from "./inject-tag-list-sync.model";

export function sameTagOrder(a: readonly string[], b: readonly string[]) {
	return a.length === b.length && a.every((tag, index) => tag === b[index]);
}

export function sameTagSet(a: readonly string[], b: readonly string[]) {
	if (a.length !== b.length) return false;
	const tags = new Set(a);
	return b.every(tag => tags.has(tag));
}

export function injectTagListSync(options: TagListSyncOptions) {
	const toast = inject(ToastService);
	const sameList = options.sameList ?? sameTagOrder;
	const confirmed = signal<readonly string[]>([]);
	const desired = signal<readonly string[]>([]);
	const saving = signal(false);
	let session = 0;
	let destroyed = false;
	inject(DestroyRef).onDestroy(() => (destroyed = true));

	const pendingTags = computed(() => {
		const saved = new Set(confirmed());
		const wanted = new Set(desired());
		return new Set(
			[...saved, ...wanted].filter(
				tag => saved.has(tag) !== wanted.has(tag)
			)
		);
	});

	const isPending = (tag: string) => pendingTags().has(tag);

	const reset = (tags: readonly string[]) => {
		session++;
		saving.set(false);
		confirmed.set(tags);
		desired.set(tags);
	};

	const sync = () => {
		if (destroyed || saving()) return;
		const target = desired();
		if (sameList(target, confirmed())) return;
		const startedIn = session;
		saving.set(true);
		options.save(target).subscribe({
			next: saved => {
				if (startedIn !== session) return;
				confirmed.set(saved);
				saving.set(false);
				if (sameList(desired(), target)) desired.set(saved);
				options.onSaved?.(saved);
				sync();
			},
			error: (error: unknown) => {
				if (startedIn !== session) return;
				saving.set(false);
				desired.set(confirmed());
				reportHttpFailure(toast, error, options.failureMessage);
				options.onFailed?.(error);
			}
		});
	};

	const set = (tags: readonly string[]) => {
		desired.set(tags);
		sync();
	};

	return {
		confirmed: confirmed.asReadonly(),
		desired: desired.asReadonly(),
		saving: saving.asReadonly(),
		isPending,
		reset,
		set
	};
}
