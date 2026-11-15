import { computed, effect, inject, signal, untracked } from "@angular/core";

import { StorageService } from "../../../core/services/storage";
import { ToastService } from "../../../core/services/toast";
import { reportHttpFailure } from "../../../shared/utils/http-failure";
import { injectLatestLoader } from "../../../shared/utils/inject-latest-loader";
import {
	DEFAULT_ENABLED_STATS,
	SavedFiltersService,
	STAT_KEYS,
	type StatKey
} from "../saved-filters";
import {
	type SavedFilter,
	type SavedFilterStats
} from "../saved-filters.model";
import { type ViewStatsOptions } from "./inject-view-stats.model";

const STATS_EXPANDED_STORAGE_KEY = "completr.backlog.statsExpanded";

export function injectViewStats(options: ViewStatsOptions) {
	const savedFiltersService = inject(SavedFiltersService);
	const toast = inject(ToastService);
	const storage = inject(StorageService);
	const statsLoader = injectLatestLoader();

	const stats = signal<SavedFilterStats | null>(null);
	const loading = signal(false);
	const loadFailed = signal(false);
	const expanded = signal(storage.get(STATS_EXPANDED_STORAGE_KEY) === "true");
	const panelOpen = signal(false);
	const configSaving = signal(false);

	const activeFilter = (): SavedFilter | null => {
		const id = options.activeFilterId();
		if (!id) return null;
		return options.savedFilters().find(filter => filter.id === id) ?? null;
	};

	const replaceFilter = (replacement: SavedFilter) => {
		const swap = (list: SavedFilter[]) =>
			list.map(filter =>
				filter.id === replacement.id ? replacement : filter
			);
		options.savedFilters.update(swap);
		options.backlogFilters.update(swap);
	};

	const enabledCount = (): number => {
		const filter = activeFilter();
		if (!filter) return 0;
		const enabled = filter.enabledStats;
		if (enabled === undefined || enabled === null) {
			return DEFAULT_ENABLED_STATS.length;
		}
		return enabled.length;
	};

	const isCustom = (): boolean => {
		const filter = activeFilter();
		if (!filter) return false;
		return (
			filter.enabledStats !== undefined && filter.enabledStats !== null
		);
	};

	const enabledKeys = computed<ReadonlySet<StatKey>>(() => {
		const enabled = activeFilter()?.enabledStats;
		if (enabled === undefined || enabled === null)
			return new Set(DEFAULT_ENABLED_STATS);
		return new Set(STAT_KEYS.filter(key => enabled.includes(key)));
	});

	const hasAnyEnabled = () => enabledKeys().size > 0;

	const load = (id: string) => {
		loading.set(true);
		loadFailed.set(false);
		statsLoader.load(savedFiltersService.getStats(id), {
			next: loaded => {
				stats.set(loaded);
				loading.set(false);
			},
			error: () => {
				stats.set(null);
				loading.set(false);
				loadFailed.set(true);
			}
		});
	};

	effect(() => {
		const id = options.activeFilterId();
		if (!id) {
			untracked(() => {
				statsLoader.cancel();
				stats.set(null);
				loading.set(false);
				loadFailed.set(false);
				panelOpen.set(false);
			});
			return;
		}
		untracked(() => load(id));
	});

	const retry = () => {
		const id = options.activeFilterId();
		if (id) load(id);
	};

	const toggleExpanded = () => {
		const next = !expanded();
		expanded.set(next);
		storage.set(STATS_EXPANDED_STORAGE_KEY, String(next));
	};

	const togglePanel = () => {
		if (!options.activeFilterId()) return;
		panelOpen.update(open => !open);
	};

	const persistEnabled = (filter: SavedFilter, value: string[] | null) => {
		if (configSaving()) return;
		configSaving.set(true);
		replaceFilter({ ...filter, enabledStats: value });
		savedFiltersService
			.update(filter.id, { enabledStats: value })
			.subscribe({
				next: updated => {
					replaceFilter(updated);
					configSaving.set(false);
				},
				error: (error: unknown) => {
					replaceFilter(filter);
					configSaving.set(false);
					reportHttpFailure(
						toast,
						error,
						"Couldn't save the stats of this view."
					);
				}
			});
	};

	const toggleKey = (key: StatKey) => {
		const filter = activeFilter();
		if (!filter) return;
		const current =
			filter.enabledStats === undefined || filter.enabledStats === null
				? [...DEFAULT_ENABLED_STATS]
				: [...filter.enabledStats];
		const index = current.indexOf(key);
		if (index >= 0) current.splice(index, 1);
		else current.push(key);
		persistEnabled(filter, current);
	};

	const resetConfig = () => {
		const filter = activeFilter();
		if (!filter) return;
		persistEnabled(filter, null);
	};

	return {
		stats,
		loading,
		loadFailed,
		expanded,
		panelOpen,
		configSaving,
		enabledCount,
		isCustom,
		enabledKeys,
		hasAnyEnabled,
		load,
		retry,
		toggleExpanded,
		togglePanel,
		toggleKey,
		resetConfig
	};
}
