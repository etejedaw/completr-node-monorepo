import {
	EXTERNAL_DATA_REFRESH_DEADLINE_MS,
	type ExternalDataSource
} from "../games.constants";
import {
	type ExternalDataRefreshTimer,
	type ExternalDataSources,
	type HltbIdResolver,
	type HltbSource,
	type MetacriticSource
} from "../games-external-data.interface";

const DEFAULT_REFRESH_TIMER: ExternalDataRefreshTimer = {
	deadlineMs: EXTERNAL_DATA_REFRESH_DEADLINE_MS,
	startTimer(milliseconds, onExpire) {
		const timer = setTimeout(onExpire, milliseconds);
		return () => clearTimeout(timer);
	}
};

let registeredSources: ExternalDataSources = {};
let refreshTimer = DEFAULT_REFRESH_TIMER;

export { EXTERNAL_DATA_SOURCES } from "../games.constants";

export function registerExternalDataSources(sources: ExternalDataSources) {
	registeredSources = { ...sources };
}

export function getMetacriticSource(): MetacriticSource | null {
	return registeredSources.metacritic ?? null;
}

export function getHltbSource(): HltbSource | null {
	return registeredSources.hltb ?? null;
}

export function getHltbIdResolver(): HltbIdResolver | null {
	return registeredSources.hltbIdResolver ?? null;
}

export function findUnavailableSources(sources: readonly ExternalDataSource[]) {
	return sources.filter(source => !registeredSources[source]);
}

export function registerExternalDataRefreshTimer(
	timer: Partial<ExternalDataRefreshTimer> = {}
) {
	refreshTimer = { ...DEFAULT_REFRESH_TIMER, ...timer };
}

export function getExternalDataRefreshTimer(): ExternalDataRefreshTimer {
	return refreshTimer;
}
