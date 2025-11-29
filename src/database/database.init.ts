import { environmentConfig } from "../common/config/environment.config";
import { sequelize } from "./sequelize.database";

import "../users/user.model";
import "../games/game.model";
import "../platforms/platform.model";

export async function databaseInit() {
	await sequelize.sync({
		force: environmentConfig.NODE_ENV === "test"
	});
}
