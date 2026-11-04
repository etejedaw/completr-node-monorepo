import { apiKeysConfig } from "./common/config/api-keys.config";
import { environmentConfig } from "./common/config/environment.config";
import { PinoLogger } from "./common/logger/pino.logger";
import { initDatabase } from "./database/init.database";
import { registerExternalDataSources } from "./games/services/external-data-sources.service";
import { HltbClient } from "./hltb/hltb.provider";
import { IgdbClient } from "./igdb/igdb.provider";
import * as jobsService from "./jobs/jobs.service";
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

async function bootstrap() {
	await initDatabase();
	await failJobsInterruptedByRestart();
	warnIfRawgDisabled();
	warnIfIgdbDisabled();
	registerScrapingProviders();

	const port = environmentConfig.PORT;
	createApp().listen(port, () =>
		logger.info("startup", "listening", { port })
	);
}

void bootstrap();
