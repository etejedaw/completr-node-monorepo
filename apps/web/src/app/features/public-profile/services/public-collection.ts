import { computed, inject, signal } from "@angular/core";
import {
	rxResource,
	takeUntilDestroyed,
	toSignal
} from "@angular/core/rxjs-interop";
import { ActivatedRoute } from "@angular/router";
import { map, type Observable } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import {
	countByPlatform,
	matchesPlatform
} from "../../../shared/components/platform-filter/platform-filter";
import { gameArtUrl } from "../../../shared/utils/game-art";
import { hasLoadFailedOf, profileAccessErrorOf } from "./profile-access-error";
import {
	type CollectionGame,
	type CollectionPage,
	type CollectionPlatform
} from "./public-collection.model";

type CollectionFetcher<T> = (
	username: string,
	pagination: { limit: number; offset: number }
) => Observable<CollectionPage<T>>;

export function injectPublicCollection<T>(
	fetchPage: CollectionFetcher<T>,
	gameOf: (item: T) => CollectionGame,
	options: {
		limit?: number;
		platformOf?: (item: T) => CollectionPlatform | null | undefined;
	} = {}
) {
	const limit = options.limit ?? 50;
	const platformOf = options.platformOf;
	const route = inject(ActivatedRoute);
	const authService = inject(AuthService);

	const username = toSignal(
		route.paramMap.pipe(map(params => params.get("username") ?? "")),
		{ initialValue: route.snapshot.paramMap.get("username") ?? "" }
	);
	const offset = signal(0);
	const requestVersion = signal(0);
	const query = signal("");
	const platform = signal("");
	const viewerReady = signal(!authService.token() || !!authService.user());

	const collection = rxResource({
		params: () =>
			viewerReady()
				? {
						username: username(),
						offset: offset(),
						version: requestVersion()
					}
				: undefined,
		stream: ({ params }) =>
			fetchPage(params.username, { limit, offset: params.offset })
	});

	const page = computed(() =>
		collection.hasValue() ? collection.value() : null
	);
	const items = computed(() => page()?.items ?? []);
	const total = computed(() => page()?.total ?? 0);
	const isLoading = computed(() => !viewerReady() || collection.isLoading());

	const error = computed(() => profileAccessErrorOf(collection.error()));

	const hasLoadFailed = computed(() => hasLoadFailedOf(collection.error()));

	const platformCounts = computed(() =>
		platformOf ? countByPlatform(items(), platformOf) : []
	);

	const visibleItems = computed(() => {
		const normalizedQuery = query().toLowerCase().trim();
		const selectedPlatform = platform();
		return items().filter(
			item =>
				(!normalizedQuery ||
					gameOf(item)
						.title.toLowerCase()
						.includes(normalizedQuery)) &&
				(!platformOf ||
					matchesPlatform(platformOf(item), selectedPlatform))
		);
	});

	const posters = computed(() =>
		items().map(item => ({
			src: gameArtUrl(gameOf(item), "portrait"),
			title: gameOf(item).title
		}))
	);

	const retry = () => collection.reload();

	const goToOffset = (nextOffset: number) => {
		query.set("");
		platform.set("");
		if (nextOffset === offset())
			requestVersion.update(version => version + 1);
		else offset.set(nextOffset);
	};

	if (!viewerReady()) {
		authService
			.loadUser()
			.pipe(takeUntilDestroyed())
			.subscribe({
				next: () => viewerReady.set(true),
				error: () => viewerReady.set(true)
			});
	}

	return {
		username,
		items,
		visibleItems,
		posters,
		total,
		offset: offset.asReadonly(),
		limit,
		isLoading,
		error,
		hasLoadFailed,
		query,
		platform,
		platformCounts,
		goToOffset,
		retry
	};
}
