import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { PaginatedSearchQuerySchema } from "../common/schemas/paginated-search-query.schema";
import * as gameShelfController from "./game-shelf.controller";
import { GameShelfIdParamSchema } from "./schemas/game-shelf-id-params.schema";
import { RegisterGameShelfSchema } from "./schemas/register-game-shelf.schema";
import { UpdateGameShelfSchema } from "./schemas/update-game-shelf.schema";

const router = Router({ mergeParams: true });

router.post(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(RegisterGameShelfSchema, "body")
	],
	gameShelfController.postGameShelf
);

router.get(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(PaginatedSearchQuerySchema, "query")
	],
	gameShelfController.getMeGameShelf
);

router.patch(
	"/:gameShelfId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(GameShelfIdParamSchema, "params"),
		validateSchemaMiddleware(UpdateGameShelfSchema, "body")
	],
	gameShelfController.patchGameShelf
);

router.delete(
	"/:gameShelfId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(GameShelfIdParamSchema, "params")
	],
	gameShelfController.deleteGameShelf
);

export default router;
