import { apiKeysConfig } from "./common/config/api-keys.config";
import { environmentConfig } from "./common/config/environment.config";
import { PinoLogger } from "./common/logger/pino.logger";
import { initDatabase } from "./database/init.database";
import { createApp } from "./server";

const logger = new PinoLogger("Server");

function warnIfRawgDisabled() {
	if (apiKeysConfig.RAWG_API_KEY) return;
	logger.warn(
		"startup",
		"RAWG_API_KEY not set: external game search and RAWG import are disabled"
	);
}

async function bootstrap() {
	await initDatabase();
	warnIfRawgDisabled();

	const port = environmentConfig.PORT;
	createApp().listen(port, () =>
		logger.info("startup", "listening", { port })
	);
}

void bootstrap();
