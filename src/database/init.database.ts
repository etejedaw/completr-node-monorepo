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
import "../backlog/backlog.model";
import "../game-scores/game-score.model";
import "../game-times/game-time.model";
import "../saved-filters/saved-filter.model";
import "../wishlist/wishlist.model";
import "../favorites/favorite.model";
import "../game-external/game-external.model";
import "../score-sources/score-source.model";

export async function initDatabase() {
	setupAssociations();

	const isTest = environmentConfig.NODE_ENV === "test";
	const isDev = environmentConfig.NODE_ENV === "dev";

	await sequelize.sync({
		force: isTest,
		alter: isDev || isTest
	});
}
