import { Sequelize } from "sequelize";
import { environmentConfig } from "../common/config/environment.config";

export const sequelize = new Sequelize(
	environmentConfig.PG_DATABASE,
	environmentConfig.PG_USER,
	environmentConfig.PG_PASSWORD,
	{
		dialect: "postgres",
		host: environmentConfig.PG_HOST,
		port: environmentConfig.PG_PORT
	}
);
