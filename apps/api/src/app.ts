import { apiKeysConfig } from "./common/config/api-keys.config";
import { environmentConfig } from "./common/config/environment.config";
import { PinoLogger } from "./common/logger/pino.logger";
import { initDatabase } from "./database/init.database";
import { registerExternalDataSources } from "./games/services/external-data-sources.service";
import { HltbClient } from "./hltb/hltb.provider";
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

function registerScrapingProviders() {
	registerExternalDataSources({
		metacritic: MetacriticClient.create(),
		hltb: HltbClient.create(),
		hltbIdResolver: WikidataClient.create()
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
	registerScrapingProviders();

	const port = environmentConfig.PORT;
	createApp().listen(port, () =>
		logger.info("startup", "listening", { port })
	);
}

void bootstrap();
