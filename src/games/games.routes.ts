import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { RegisterGameSchema } from "./schemas/register-game.schema";
import * as gamesController from "./games.controller";
import { UpdateGameSchema } from "./schemas/update-game.schema";
import { GameIdParamSchema } from "./schemas/game-id-params.schema";
import { GameCodeParamSchema } from "./schemas/game-code-params.schema";
import { GameSearchQuerySchema } from "./schemas/game-search-query.schema";
import { RawgIdParamSchema } from "./schemas/rawg-id-params.schema";
import { GamesQuerySchema } from "./schemas/games-query.schema";
import { SplitGameSchema } from "./schemas/split-game.schema";
import { MarkCompilationSchema } from "./schemas/mark-compilation.schema";
import reviewsRouter from "../reviews/reviews.routes";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import {
	publicLimiter,
	userLimiter
} from "../common/config/rate-limiter.config";

const router = Router();

router.get(
	"/games",
	[
		authMiddleware(),
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(GamesQuerySchema, "query")
	],
	gamesController.getAllGames
);

router.get(
	"/games/search",
	[
		authMiddleware(),
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(GameSearchQuerySchema, "query")
	],
	gamesController.searchGames
);

router.get(
	"/games/latest-reviewed",
	[authMiddleware(), rateLimiterMiddleware(publicLimiter)],
	gamesController.getLatestReviewedGames
);

router.get(
	"/games/rawg-lookup",
	[
		authMiddleware("moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(GameSearchQuerySchema, "query")
	],
	gamesController.getRawgLookup
);

router.get(
	"/games/rawg-detail/:rawgId",
	[
		authMiddleware("moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(RawgIdParamSchema, "params")
	],
	gamesController.getRawgDetail
);

router.get(
	"/games/:code",
	[
		authMiddleware(),
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(GameCodeParamSchema, "params")
	],
	gamesController.getGameByCode
);

router.post(
	"/games",
	[
		authMiddleware("moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(RegisterGameSchema, "body")
	],
	gamesController.postGame
);

router.patch(
	"/games/:id",
	[
		authMiddleware("moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(GameIdParamSchema, "params"),
		validateSchemaMiddleware(UpdateGameSchema, "body")
	],
	gamesController.patchGame
);

router.post(
	"/games/:id/split",
	[
		authMiddleware("moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(GameIdParamSchema, "params"),
		validateSchemaMiddleware(SplitGameSchema, "body")
	],
	gamesController.postSplitGame
);

router.put(
	"/games/:id/compilation-items",
	[
		authMiddleware("moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(GameIdParamSchema, "params"),
		validateSchemaMiddleware(MarkCompilationSchema, "body")
	],
	gamesController.putCompilationItems
);

router.delete(
	"/games/:id/compilation-items",
	[
		authMiddleware("moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(GameIdParamSchema, "params")
	],
	gamesController.deleteCompilation
);

router.delete(
	"/games/:id",
	[
		authMiddleware("admin"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(GameIdParamSchema, "params")
	],
	gamesController.deleteGame
);

router.post(
	"/games/:id/reactivate",
	[
		authMiddleware("admin"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(GameIdParamSchema, "params")
	],
	gamesController.reactivateGame
);

router.use("/games/:id/reviews", reviewsRouter);

router.get(
	"/games/:id/lists",
	[
		authMiddleware(),
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(GameIdParamSchema, "params")
	],
	gamesController.getGameLists
);

router.get(
	"/games/:id/friends-activity",
	[
		authMiddleware(),
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(GameIdParamSchema, "params")
	],
	gamesController.getGameFriendsActivity
);

router.get(
	"/games/:id/players",
	[
		authMiddleware(),
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(GameIdParamSchema, "params")
	],
	gamesController.getGamePlayers
);

export default router;
