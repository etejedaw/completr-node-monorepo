import { Game } from "../games/game.model";
import { Platform } from "../platforms/platform.model";
import { GamePlatform } from "../game-platforms/game-platform.model";

export function setupAssociations() {
	platformGame();
}

function platformGame() {
	Platform.belongsToMany(Game, {
		through: GamePlatform,
		foreignKey: "platformId",
		otherKey: "gameId"
	});

	Game.belongsToMany(Platform, {
		through: GamePlatform,
		foreignKey: "gameId",
		otherKey: "platformId"
	});
}
