import { Sequelize } from "sequelize";
import { databaseConfig } from "../common/config/database.config";

export const sequelize = new Sequelize(
	databaseConfig.PG_DATABASE,
	databaseConfig.PG_USER,
	databaseConfig.PG_PASSWORD,
	{
		dialect: "postgres",
		host: databaseConfig.PG_HOST,
		port: databaseConfig.PG_PORT
	}
);
