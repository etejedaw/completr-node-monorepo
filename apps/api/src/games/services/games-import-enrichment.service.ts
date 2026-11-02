import { type Logger } from "../../common/logger/logger.interface";
import { PinoLogger } from "../../common/logger/pino.logger";
import {
	EXTERNAL_DATA_SOURCES,
	type ExternalDataSource
} from "../games.constants";
import {
	type ExternalDataCandidate,
	type ExternalDataGame,
	type ExternalDataResult
} from "../games-external-data.interface";
import { isExternalDataThrottled } from "../utils/is-external-data-throttled.util";
import { findUnavailableSources } from "./external-data-sources.service";
import {
	findExternalDataCandidate,
	refreshExternalDataForGame
} from "./games-external-data.service";

export const IMPORT_ENRICHMENT_QUEUE_CAPACITY = 50;
export const IMPORT_ENRICHMENT_PAUSE_MS = 10 * 60 * 1000;

export interface ImportEnrichmentQueueDependencies {
	findCandidate(gameId: string): Promise<ExternalDataCandidate | null>;
	refresh(
		game: ExternalDataGame,
		sources: readonly ExternalDataSource[]
	): Promise<ExternalDataResult[]>;
	availableSources(): ExternalDataSource[];
	now(): number;
	logger: Logger;
	capacity: number;
	pauseMs: number;
}

export interface ImportEnrichmentQueue {
	enqueue(gameIds: readonly string[]): void;
	whenIdle(): Promise<void>;
	isPaused(): boolean;
	size(): number;
}

const OPERATION = "importEnrichment";

export function createImportEnrichmentQueue(
	dependencies: ImportEnrichmentQueueDependencies
): ImportEnrichmentQueue {
	const { logger } = dependencies;
	const pending: string[] = [];
	const tracked = new Set<string>();
	let pausedUntil = 0;
	let draining: Promise<void> | null = null;

	function isPaused() {
		return dependencies.now() < pausedUntil;
	}

	function enqueue(gameIds: readonly string[]) {
		try {
			if (gameIds.length === 0) return;
			if (dependencies.availableSources().length === 0) return;
			if (isPaused()) {
				logger.warn(OPERATION, "paused: imported games ignored", {
					gameIds,
					pausedUntil: new Date(pausedUntil).toISOString()
				});
				return;
			}

			const fresh = [...new Set(gameIds)].filter(id => !tracked.has(id));
			const room = Math.max(dependencies.capacity - pending.length, 0);
			const accepted = fresh.slice(0, room);
			const dropped = fresh.slice(room);
			if (dropped.length > 0)
				logger.warn(OPERATION, "queue full: imported games dropped", {
					gameIds: dropped,
					capacity: dependencies.capacity
				});

			for (const gameId of accepted) {
				pending.push(gameId);
				tracked.add(gameId);
			}
			if (accepted.length > 0) startDraining();
		} catch (error) {
			logger.error(OPERATION, "enqueue failed", describeError(error));
		}
	}

	function startDraining() {
		if (draining) return;
		draining = drain()
			.catch(error =>
				logger.error(OPERATION, "drain failed", describeError(error))
			)
			.finally(() => {
				draining = null;
				if (pending.length > 0) startDraining();
			});
	}

	async function drain() {
		while (pending.length > 0) {
			const gameId = pending.shift()!;
			try {
				if (await enrichGame(gameId)) pause(gameId);
			} catch (error) {
				logger.error(OPERATION, "game enrichment failed", {
					gameId,
					...describeError(error)
				});
			} finally {
				tracked.delete(gameId);
			}
		}
	}

	async function enrichGame(gameId: string) {
		const candidate = await dependencies.findCandidate(gameId);
		if (!candidate) return false;

		const available = new Set(dependencies.availableSources());
		const sources = candidate.sources.filter(source =>
			available.has(source)
		);
		if (sources.length === 0) return false;

		const results = await dependencies.refresh(candidate.game, sources);
		logger.info(OPERATION, "game enriched", {
			gameId,
			results: results.map(({ source, status, errorCode }) => ({
				source,
				status,
				errorCode
			}))
		});
		return results.some(isExternalDataThrottled);
	}

	function pause(gameId: string) {
		pausedUntil = dependencies.now() + dependencies.pauseMs;
		const discarded = pending.splice(0);
		for (const discardedId of discarded) tracked.delete(discardedId);
		logger.warn(OPERATION, "provider throttled: queue paused", {
			gameId,
			discarded,
			pausedUntil: new Date(pausedUntil).toISOString()
		});
	}

	async function whenIdle() {
		while (draining) await draining;
	}

	return { enqueue, whenIdle, isPaused, size: () => tracked.size };
}

function describeError(error: unknown) {
	return error instanceof Error
		? { message: error.message, name: error.name }
		: { error: String(error) };
}

function availableExternalDataSources() {
	const unavailable = new Set(findUnavailableSources(EXTERNAL_DATA_SOURCES));
	return EXTERNAL_DATA_SOURCES.filter(source => !unavailable.has(source));
}

const importEnrichmentQueue = createImportEnrichmentQueue({
	findCandidate: findExternalDataCandidate,
	refresh: refreshExternalDataForGame,
	availableSources: availableExternalDataSources,
	now: () => Date.now(),
	logger: new PinoLogger("GamesImportEnrichment"),
	capacity: IMPORT_ENRICHMENT_QUEUE_CAPACITY,
	pauseMs: IMPORT_ENRICHMENT_PAUSE_MS
});

export function enqueueImportedGames(gameIds: readonly string[]) {
	importEnrichmentQueue.enqueue(gameIds);
}

export function whenImportEnrichmentIdle() {
	return importEnrichmentQueue.whenIdle();
}

export function isImportEnrichmentPaused() {
	return importEnrichmentQueue.isPaused();
}
