import {
	EXTERNAL_DATA_REFRESH_DEADLINE_MS,
	type ExternalDataSource,
	IGDB_MIN_REQUEST_INTERVAL_MS,
	REQUIRED_EXTERNAL_DATA_SOURCES
} from "../games.constants";
import {
	type ExternalDataRefreshTimer,
	type ExternalDataRequestPacer,
	type ExternalDataSources,
	type HltbIdResolver,
	type HltbSource,
	type IgdbSource,
	type MetacriticSource
} from "../games-external-data.interface";
import { createRequestPacer } from "../utils/create-request-pacer.util";

const DEFAULT_REFRESH_TIMER: ExternalDataRefreshTimer = {
	deadlineMs: EXTERNAL_DATA_REFRESH_DEADLINE_MS,
	startTimer(milliseconds, onExpire) {
		const timer = setTimeout(onExpire, milliseconds);
		return () => clearTimeout(timer);
	}
};

let registeredSources: ExternalDataSources = {};
let refreshTimer = DEFAULT_REFRESH_TIMER;
let igdbRequestPacer = createRequestPacer(IGDB_MIN_REQUEST_INTERVAL_MS);

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

export function getIgdbSource(): IgdbSource | null {
	return registeredSources.igdb ?? null;
}

export function registerIgdbRequestPacer(
	pacer: ExternalDataRequestPacer = createRequestPacer(
		IGDB_MIN_REQUEST_INTERVAL_MS
	)
) {
	igdbRequestPacer = pacer;
}

export function getIgdbRequestPacer(): ExternalDataRequestPacer {
	return igdbRequestPacer;
}

export function findUnavailableSources(sources: readonly ExternalDataSource[]) {
	return sources.filter(source => !registeredSources[source]);
}

export function isExternalDataSourceTracked(source: ExternalDataSource) {
	return (
		(
			REQUIRED_EXTERNAL_DATA_SOURCES as readonly ExternalDataSource[]
		).includes(source) || Boolean(registeredSources[source])
	);
}

export function registerExternalDataRefreshTimer(
	timer: Partial<ExternalDataRefreshTimer> = {}
) {
	refreshTimer = { ...DEFAULT_REFRESH_TIMER, ...timer };
}

export function getExternalDataRefreshTimer(): ExternalDataRefreshTimer {
	return refreshTimer;
}
