import { environmentConfig } from "../common/config/environment.config";
import { sequelize } from "./sequelize.database";

import "../users/user.model";
import "../games/game.model";

export async function databaseInit() {
	await sequelize.sync({
		alter: environmentConfig.NODE_ENV === "test"
	});
}
