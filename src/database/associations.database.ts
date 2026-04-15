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
import { Backlog } from "../backlog/backlog.model";
import { GameScore } from "../game-scores/game-score.model";
import { GameTime } from "../game-times/game-time.model";
import { SavedFilter } from "../saved-filters/saved-filter.model";
import { Wishlist } from "../wishlist/wishlist.model";
import { Favorite } from "../favorites/favorite.model";
import { GameExternal } from "../game-external/game-external.model";
import { ScoreSource } from "../score-sources/score-source.model";
import { RefreshToken } from "../auth/refresh-token.model";
import { GameReport } from "../game-reports/game-report.model";
import { UserFollower } from "../user-followers/user-follower.model";
import { Activity } from "../activity/activity.model";
import { ActivityGame } from "../activity/targets/activity-game.model";
import { ActivityList } from "../activity/targets/activity-list.model";
import { ActivityUser } from "../activity/targets/activity-user.model";

export function setupAssociations() {
	gameDlc();
	gamePlatform();
	gameGenre();
	gameShelf();
	lists();
	listItems();
	listFollowers();
	backlog();
	gameScores();
	gameTimes();
	savedFilters();
	wishlist();
	favorites();
	gameExternalIds();
	scoreSources();
	refreshTokens();
	gameReports();
	userFollowers();
	activities();
}

function gameDlc() {
	Game.hasMany(Game, { foreignKey: "parentGameId", as: "Dlcs" });
	Game.belongsTo(Game, { foreignKey: "parentGameId", as: "ParentGame" });
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
		otherKey: "platformId",
		onDelete: "CASCADE"
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
		otherKey: "genreId",
		onDelete: "CASCADE"
	});
}

function gameShelf() {
	User.hasMany(GameShelf, { foreignKey: "userId" });
	GameShelf.belongsTo(User, { foreignKey: "userId" });

	Game.hasMany(GameShelf, { foreignKey: "gameId", onDelete: "CASCADE" });
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

	Game.hasMany(ListItem, { foreignKey: "gameId", onDelete: "CASCADE" });
	ListItem.belongsTo(Game, { foreignKey: "gameId" });
}

function listFollowers() {
	List.hasMany(ListFollower, { foreignKey: "listId" });
	ListFollower.belongsTo(List, { foreignKey: "listId" });

	User.hasMany(ListFollower, { foreignKey: "userId" });
	ListFollower.belongsTo(User, { foreignKey: "userId" });
}

function backlog() {
	User.hasMany(Backlog, { foreignKey: "userId" });
	Backlog.belongsTo(User, { foreignKey: "userId" });

	Game.hasMany(Backlog, { foreignKey: "gameId", onDelete: "CASCADE" });
	Backlog.belongsTo(Game, { foreignKey: "gameId" });

	Platform.hasMany(Backlog, { foreignKey: "platformId" });
	Backlog.belongsTo(Platform, { foreignKey: "platformId" });
}

function gameScores() {
	Game.hasMany(GameScore, { foreignKey: "gameId", onDelete: "CASCADE" });
	GameScore.belongsTo(Game, { foreignKey: "gameId" });
}

function gameTimes() {
	Game.hasMany(GameTime, { foreignKey: "gameId", onDelete: "CASCADE" });
	GameTime.belongsTo(Game, { foreignKey: "gameId" });
}

function savedFilters() {
	User.hasMany(SavedFilter, { foreignKey: "userId" });
	SavedFilter.belongsTo(User, { foreignKey: "userId" });
}

function wishlist() {
	User.hasMany(Wishlist, { foreignKey: "userId" });
	Wishlist.belongsTo(User, { foreignKey: "userId" });

	Backlog.hasMany(Wishlist, { foreignKey: "backlogId" });
	Wishlist.belongsTo(Backlog, { foreignKey: "backlogId" });
}

function favorites() {
	User.hasMany(Favorite, { foreignKey: "userId" });
	Favorite.belongsTo(User, { foreignKey: "userId" });

	Game.hasMany(Favorite, { foreignKey: "gameId", onDelete: "CASCADE" });
	Favorite.belongsTo(Game, { foreignKey: "gameId" });
}

function gameExternalIds() {
	Game.hasMany(GameExternal, { foreignKey: "gameId", onDelete: "CASCADE" });
	GameExternal.belongsTo(Game, { foreignKey: "gameId" });
}

function gameReports() {
	User.hasMany(GameReport, { foreignKey: "userId" });
	GameReport.belongsTo(User, { foreignKey: "userId" });

	Game.hasMany(GameReport, { foreignKey: "gameId", onDelete: "CASCADE" });
	GameReport.belongsTo(Game, { foreignKey: "gameId" });
}

function refreshTokens() {
	User.hasMany(RefreshToken, { foreignKey: "userId", onDelete: "CASCADE" });
	RefreshToken.belongsTo(User, { foreignKey: "userId" });
}

function userFollowers() {
	User.hasMany(UserFollower, { foreignKey: "followerId", as: "Following" });
	User.hasMany(UserFollower, { foreignKey: "followingId", as: "Followers" });
	UserFollower.belongsTo(User, { foreignKey: "followerId", as: "Follower" });
	UserFollower.belongsTo(User, {
		foreignKey: "followingId",
		as: "Following"
	});
}

function activities() {
	User.hasMany(Activity, { foreignKey: "userId" });
	Activity.belongsTo(User, { foreignKey: "userId" });

	Activity.hasOne(ActivityGame, {
		foreignKey: "activityId",
		onDelete: "CASCADE"
	});
	ActivityGame.belongsTo(Activity, { foreignKey: "activityId" });
	Game.hasMany(ActivityGame, { foreignKey: "gameId", onDelete: "CASCADE" });
	ActivityGame.belongsTo(Game, { foreignKey: "gameId" });

	Activity.hasOne(ActivityList, {
		foreignKey: "activityId",
		onDelete: "CASCADE"
	});
	ActivityList.belongsTo(Activity, { foreignKey: "activityId" });
	List.hasMany(ActivityList, { foreignKey: "listId", onDelete: "CASCADE" });
	ActivityList.belongsTo(List, { foreignKey: "listId" });

	Activity.hasOne(ActivityUser, {
		foreignKey: "activityId",
		onDelete: "CASCADE"
	});
	ActivityUser.belongsTo(Activity, { foreignKey: "activityId" });
	User.hasMany(ActivityUser, { foreignKey: "targetUserId" });
	ActivityUser.belongsTo(User, {
		foreignKey: "targetUserId",
		as: "TargetUser"
	});
}

function scoreSources() {
	ScoreSource.hasMany(GameScore, {
		foreignKey: "source",
		sourceKey: "code"
	});
	GameScore.belongsTo(ScoreSource, {
		foreignKey: "source",
		targetKey: "code"
	});
}
