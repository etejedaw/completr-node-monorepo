import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import * as gameTimesController from "./game-times.controller";
import { GameTimeIdParamsSchema } from "./schemas/game-time-id-params.schema";
import { GameTimeParamsSchema } from "./schemas/game-time-params.schema";
import { RegisterGameTimeSchema } from "./schemas/register-game-time.schema";
import { UpdateGameTimeSchema } from "./schemas/update-game-time.schema";

const router = Router();

router.post(
	"/game-times",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("moderator"),
		validateSchemaMiddleware(RegisterGameTimeSchema, "body")
	],
	gameTimesController.postGameTime
);

router.patch(
	"/game-times/:gameId/:source",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("moderator"),
		validateSchemaMiddleware(GameTimeIdParamsSchema, "params"),
		validateSchemaMiddleware(UpdateGameTimeSchema, "body")
	],
	gameTimesController.patchGameTime
);

router.get(
	"/game-times/:gameId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(GameTimeParamsSchema, "params")
	],
	gameTimesController.getGameTimes
);

router.delete(
	"/game-times/:gameId/:source",
	[
		authMiddleware("moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(GameTimeIdParamsSchema, "params")
	],
	gameTimesController.deleteGameTime
);

export default router;
