import { computed, DestroyRef, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ActivatedRoute } from "@angular/router";
import { type Observable } from "rxjs";

import { AuthService } from "../../../core/services/auth";
import { type ProfileAccessError } from "../components/profile-access-state";

interface CollectionItem {
	game: { title: string; backgroundUrl?: string };
}

interface CollectionPage<T> {
	items: T[];
	total: number;
}

type CollectionFetcher<T> = (
	username: string,
	pagination: { limit: number; offset: number }
) => Observable<CollectionPage<T>>;

export function injectPublicCollection<T extends CollectionItem>(
	fetchPage: CollectionFetcher<T>,
	limit = 50
) {
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

	const visibleItems = computed(() => {
		const normalizedQuery = query().toLowerCase().trim();
		if (!normalizedQuery) return items();
		return items().filter(item =>
			item.game.title.toLowerCase().includes(normalizedQuery)
		);
	});

	const posters = computed(() =>
		items().map(item => ({
			src: item.game.backgroundUrl,
			title: item.game.title
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
		goToOffset
	};
}
