import { computed, DestroyRef, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ActivatedRoute } from "@angular/router";
import { type Observable } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import {
	countByPlatform,
	matchesPlatform
} from "../../../shared/components/platform-filter/platform-filter";
import { type ProfileAccessError } from "../components/profile-access-state";
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
	const destroyRef = inject(DestroyRef);

	const username = signal(route.snapshot.paramMap.get("username") ?? "");
	const items = signal<T[]>([]);
	const total = signal(0);
	const offset = signal(0);
	const isLoading = signal(true);
	const error = signal<ProfileAccessError | null>(null);
	const query = signal("");
	const platform = signal("");

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
			src: gameOf(item).backgroundUrl,
			title: gameOf(item).title
		}))
	);

	const load = () => {
		isLoading.set(true);
		error.set(null);
		fetchPage(username(), { limit, offset: offset() })
			.pipe(takeUntilDestroyed(destroyRef))
			.subscribe({
				next: page => {
					items.set(page.items);
					total.set(page.total);
					isLoading.set(false);
				},
				error: err => {
					if (err.status === 403) error.set("private");
					else if (err.status === 404) error.set("not_found");
					isLoading.set(false);
				}
			});
	};

	const goToOffset = (nextOffset: number) => {
		offset.set(nextOffset);
		query.set("");
		platform.set("");
		load();
	};

	if (authService.token() && !authService.user()) {
		authService.loadUser().subscribe({ next: load, error: load });
	} else {
		load();
	}

	return {
		username: username.asReadonly(),
		items: items.asReadonly(),
		visibleItems,
		posters,
		total: total.asReadonly(),
		offset: offset.asReadonly(),
		limit,
		isLoading: isLoading.asReadonly(),
		error: error.asReadonly(),
		query,
		platform,
		platformCounts,
		goToOffset
	};
}
