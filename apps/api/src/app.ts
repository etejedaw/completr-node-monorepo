import { type Server } from "node:http";

import { type Cron } from "croner";

import { apiKeysConfig } from "./common/config/api-keys.config";
import { environmentConfig } from "./common/config/environment.config";
import { PinoLogger } from "./common/logger/pino.logger";
import { describeFailure } from "./common/utils/describe-failure.util";
import { closeDatabase, initDatabase } from "./database/init.database";
import { registerExternalDataSources } from "./games/services/external-data-sources.service";
import { HltbClient } from "./hltb/hltb.provider";
import { IgdbClient } from "./igdb/igdb.provider";
import * as jobsService from "./jobs/jobs.service";
import { startRewindFreezeScheduler } from "./jobs/rewind-freeze.scheduler";
import { MetacriticClient } from "./metacritic/metacritic.provider";
import { createApp } from "./server";
import { WikidataClient } from "./wikidata/wikidata.provider";

const logger = new PinoLogger("Server");

function warnIfRawgDisabled() {
	if (apiKeysConfig.RAWG_API_KEY) return;
	logger.warn(
		"startup",
		"RAWG_API_KEY not set: external game search and RAWG import are disabled"
	);
}

function warnIfIgdbDisabled() {
	if (apiKeysConfig.IGDB_CLIENT_ID && apiKeysConfig.IGDB_CLIENT_SECRET)
		return;
	logger.warn(
		"startup",
		"IGDB_CLIENT_ID or IGDB_CLIENT_SECRET not set: the IGDB integration is disabled"
	);
}

function createIgdbSourceIfEnabled() {
	const igdb = IgdbClient.create(
		apiKeysConfig.IGDB_CLIENT_ID,
		apiKeysConfig.IGDB_CLIENT_SECRET
	);
	return igdb.isEnabled ? igdb : undefined;
}

function registerScrapingProviders() {
	registerExternalDataSources({
		metacritic: MetacriticClient.create(),
		hltb: HltbClient.create(),
		hltbIdResolver: WikidataClient.create(),
		igdb: createIgdbSourceIfEnabled()
	});
}

async function failJobsInterruptedByRestart() {
	const interruptedCount = await jobsService.failInterruptedJobs();
	if (interruptedCount === 0) return;
	logger.warn("startup", "jobs interrupted by the restart marked as failed", {
		count: interruptedCount
	});
}

async function closeDatabaseAndExit() {
	try {
		await closeDatabase();
		process.exit(0);
	} catch (error) {
		logger.error("shutdown", "closing the database failed", {
			error: describeFailure(error)
		});
		process.exit(1);
	}
}

function stopOnTerminationSignals(scheduler: Cron, server: Server) {
	const shutdown = (signal: string) => {
		logger.info("shutdown", "stopping", { signal });
		scheduler.stop();
		server.close(() => void closeDatabaseAndExit());
	};
	process.once("SIGTERM", () => shutdown("SIGTERM"));
	process.once("SIGINT", () => shutdown("SIGINT"));
}

async function bootstrap() {
	await initDatabase();
	await failJobsInterruptedByRestart();
	warnIfRawgDisabled();
	warnIfIgdbDisabled();
	registerScrapingProviders();
	const rewindFreezeScheduler = startRewindFreezeScheduler();

	const port = environmentConfig.PORT;
	const server = createApp().listen(port, () =>
		logger.info("startup", "listening", { port })
	);
	stopOnTerminationSignals(rewindFreezeScheduler, server);
}

bootstrap().catch((error: unknown) => {
	logger.error("startup", "failed", {
		error: describeFailure(error),
		stack: error instanceof Error ? error.stack : undefined
	});
	process.exit(1);
});
