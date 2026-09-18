import { Sequelize } from "sequelize";

import { databaseConfig } from "../common/config/database.config";
import { environmentConfig } from "../common/config/environment.config";
import { PinoLogger } from "../common/logger/pino.logger";

const logger = new PinoLogger("Database");

export const sequelize = new Sequelize(
	databaseConfig.PG_DATABASE,
	databaseConfig.PG_USER,
	databaseConfig.PG_PASSWORD,
	{
		dialect: "postgres",
		host: databaseConfig.PG_HOST,
		port: databaseConfig.PG_PORT,
		logging:
			environmentConfig.NODE_ENV !== "prd"
				? sql => logger.debug("query", sql)
				: false
	}
);
