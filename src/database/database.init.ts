import { environmentConfig } from "../common/config/environment.config";
import { sequelize } from "./sequelize.database";
import { setupAssociations } from "./associations.database";

import "../users/user.model";
import "../games/game.model";
import "../platforms/platform.model";
import "../genres/genres.model";
import "../game-platform/game-platform.model";
import "../game-genre/game-genre.model";
import "../game-shelf/game-shelf.model";
import "../lists/list.model";
import "../list-items/list-item.model";
import "../list-followers/list-follower.model";
import "../user-game-status/user-game-status.model";
import "../playthroughs/playthrough.model";
import "../game-scores/game-score.model";
import "../saved-filters/saved-filter.model";

export async function databaseInit() {
	setupAssociations();

	await sequelize.sync({
		force: environmentConfig.NODE_ENV === "test",
		alter: environmentConfig.NODE_ENV === "dev"
	});
}
