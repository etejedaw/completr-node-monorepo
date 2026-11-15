import "./models.database";

import { databaseConfig } from "../common/config/database.config";
import { PinoLogger } from "../common/logger/pino.logger";
import { describeFailure } from "../common/utils/describe-failure.util";
import { setupAssociations } from "./associations.database";
import { sequelize } from "./sequelize.database";

const logger = new PinoLogger("Database");

export async function initDatabase() {
	setupAssociations();
	try {
		await sequelize.authenticate();
		logger.info("connect", "ok", {
			host: databaseConfig.PG_HOST,
			database: databaseConfig.PG_DATABASE
		});
	} catch (error) {
		logger.warn("connect", "failed", { error: describeFailure(error) });
	}
}

export async function closeDatabase() {
	await sequelize.close();
	logger.info("close", "ok");
}
