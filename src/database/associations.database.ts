import { Game } from "../games/game.model";
import { Platform } from "../platforms/platform.model";
import { GamePlatform } from "../game-platform/game-platform.model";

export function setupAssociations() {
	gamePlatform();
}

function gamePlatform() {
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
