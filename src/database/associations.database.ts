import { Game } from "../games/game.model";
import { Platform } from "../platforms/platform.model";
import { GamePlatform } from "../game-platform/game-platform.model";
import { User } from "../users/user.model";
import { GameShelf } from "../game-shelf/game-shelf.model";

export function setupAssociations() {
	gamePlatform();
	gameShelf();
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

function gameShelf() {
	User.hasMany(GameShelf, { foreignKey: "userId" });
	GameShelf.belongsTo(User, { foreignKey: "userId" });

	Game.hasMany(GameShelf, { foreignKey: "gameId" });
	GameShelf.belongsTo(Game, { foreignKey: "gameId" });

	Platform.hasMany(GameShelf, { foreignKey: "platformId" });
	GameShelf.belongsTo(Platform, { foreignKey: "platformId" });
}
