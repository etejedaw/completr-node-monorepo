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
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import {
	publicLimiter,
	userLimiter
} from "../common/config/rate-limiter.config";

const router = Router();

router.get(
	"/games",
	[rateLimiterMiddleware(publicLimiter)],
	gamesController.getAllGames
);

router.get(
	"/games/search",
	[
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(GameSearchQuerySchema, "query")
	],
	gamesController.searchGames
);

router.get(
	"/games/rawg-lookup",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("moderator"),
		validateSchemaMiddleware(GameSearchQuerySchema, "query")
	],
	gamesController.getRawgLookup
);

router.get(
	"/games/rawg-detail/:rawgId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("moderator"),
		validateSchemaMiddleware(RawgIdParamSchema, "params")
	],
	gamesController.getRawgDetail
);

router.get(
	"/games/:code",
	[
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(GameCodeParamSchema, "params")
	],
	gamesController.getGameByCode
);

router.post(
	"/games",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("moderator"),
		validateSchemaMiddleware(RegisterGameSchema, "body")
	],
	gamesController.postGame
);

router.patch(
	"/games/:id",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("moderator"),
		validateSchemaMiddleware(GameIdParamSchema, "params"),
		validateSchemaMiddleware(UpdateGameSchema, "body")
	],
	gamesController.patchGame
);

router.delete(
	"/games/:id",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("moderator"),
		validateSchemaMiddleware(GameIdParamSchema, "params")
	],
	gamesController.deleteGame
);

export default router;
