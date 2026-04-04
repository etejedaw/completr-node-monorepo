import { Router } from "express";
import * as gameTimesController from "./game-times.controller";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { authMiddleware } from "../auth/auth.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { RegisterGameTimeSchema } from "./schemas/register-game-time.schema";
import { GameTimeParamsSchema } from "./schemas/game-time-params.schema";

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

router.get(
	"/game-times/:gameId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(GameTimeParamsSchema, "params")
	],
	gameTimesController.getGameTimes
);

export default router;
