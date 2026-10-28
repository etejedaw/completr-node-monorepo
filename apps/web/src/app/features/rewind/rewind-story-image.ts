import {
	computed,
	effect,
	inject,
	linkedSignal,
	type Signal,
	signal
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";

import { RewindService } from "./rewind";

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

function sameTarget(
	a: RewindShareTarget | null,
	b: RewindShareTarget | null
): boolean {
	return a?.username === b?.username && a?.year === b?.year;
}

export function injectRewindStoryImage(
	target: () => RewindShareTarget | null
): RewindStoryImage {
	const rewindService = inject(RewindService);
	const currentTarget = computed(target, { equal: sameTarget });
	const requested = linkedSignal({
		source: currentTarget,
		computation: () => false
	});

	const image = rxResource({
		params: () =>
			requested() ? (currentTarget() ?? undefined) : undefined,
		stream: ({ params }) =>
			rewindService.getImage(params.username, params.year, "story")
	});

	const blob = computed(() => (image.hasValue() ? image.value() : null));
	const objectUrl = signal<string | null>(null);

	effect(onCleanup => {
		const current = blob();
		if (!current) {
			objectUrl.set(null);
			return;
		}
		const url = URL.createObjectURL(current);
		objectUrl.set(url);
		onCleanup(() => URL.revokeObjectURL(url));
	});

	return {
		target: currentTarget,
		blob,
		objectUrl: objectUrl.asReadonly(),
		isLoading: image.isLoading,
		hasError: computed(() => image.status() === "error"),
		request: () => {
			if (currentTarget()) requested.set(true);
		},
		retry: () => image.reload()
	};
}
