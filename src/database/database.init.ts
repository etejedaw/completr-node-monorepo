import { environmentConfig } from "../common/config/environment.config";
import { sequelize } from "./sequelize.database";
import { setupAssociations } from "./associations.database";

import "../users/user.model";
import "../games/game.model";
import "../platforms/platform.model";
import "../game-shelf/game-shelf.model";

export async function databaseInit() {
	setupAssociations();

	await sequelize.sync({
		force: environmentConfig.NODE_ENV === "test",
		alter: environmentConfig.NODE_ENV === "dev"
	});
}
