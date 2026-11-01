import { type ExternalDataSource } from "../games.constants";
import {
	type ExternalDataSources,
	type HltbIdResolver,
	type HltbSource,
	type MetacriticSource
} from "../games-external-data.interface";

let registeredSources: ExternalDataSources = {};

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
