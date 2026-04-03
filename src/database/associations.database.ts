import { Game } from "../games/game.model";
import { Platform } from "../platforms/platform.model";
import { Genre } from "../genres/genres.model";
import { GamePlatform } from "../game-platform/game-platform.model";
import { GameGenre } from "../game-genre/game-genre.model";
import { User } from "../users/user.model";
import { GameShelf } from "../game-shelf/game-shelf.model";
import { List } from "../lists/list.model";
import { ListItem } from "../list-items/list-item.model";
import { ListFollower } from "../list-followers/list-follower.model";
import { UserGameStatus } from "../user-game-status/user-game-status.model";
import { Playthrough } from "../playthroughs/playthrough.model";

export function setupAssociations() {
	gamePlatform();
	gameGenre();
	gameShelf();
	lists();
	listItems();
	listFollowers();
	userGameStatus();
	playthroughs();
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

function gameGenre() {
	Genre.belongsToMany(Game, {
		through: GameGenre,
		foreignKey: "genreId",
		otherKey: "gameId"
	});

	Game.belongsToMany(Genre, {
		through: GameGenre,
		foreignKey: "gameId",
		otherKey: "genreId"
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

function lists() {
	User.hasMany(List, { foreignKey: "userId" });
	List.belongsTo(User, { foreignKey: "userId" });
}

function listItems() {
	List.hasMany(ListItem, { foreignKey: "listId" });
	ListItem.belongsTo(List, { foreignKey: "listId" });

	Game.hasMany(ListItem, { foreignKey: "gameId" });
	ListItem.belongsTo(Game, { foreignKey: "gameId" });

	Playthrough.hasMany(ListItem, { foreignKey: "playthroughId" });
	ListItem.belongsTo(Playthrough, { foreignKey: "playthroughId" });
}

function listFollowers() {
	List.hasMany(ListFollower, { foreignKey: "listId" });
	ListFollower.belongsTo(List, { foreignKey: "listId" });

	User.hasMany(ListFollower, { foreignKey: "userId" });
	ListFollower.belongsTo(User, { foreignKey: "userId" });
}

function userGameStatus() {
	User.hasMany(UserGameStatus, { foreignKey: "userId" });
	UserGameStatus.belongsTo(User, { foreignKey: "userId" });

	Game.hasMany(UserGameStatus, { foreignKey: "gameId" });
	UserGameStatus.belongsTo(Game, { foreignKey: "gameId" });
}

function playthroughs() {
	User.hasMany(Playthrough, { foreignKey: "userId" });
	Playthrough.belongsTo(User, { foreignKey: "userId" });

	Game.hasMany(Playthrough, { foreignKey: "gameId" });
	Playthrough.belongsTo(Game, { foreignKey: "gameId" });

	Platform.hasMany(Playthrough, { foreignKey: "platformId" });
	Playthrough.belongsTo(Platform, { foreignKey: "platformId" });
}
