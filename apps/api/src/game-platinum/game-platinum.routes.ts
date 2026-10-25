import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import * as gamePlatinumController from "./game-platinum.controller";
import { GamePlatinumParamsSchema } from "./schemas/game-platinum-params.schema";
import { UpsertGamePlatinumSchema } from "./schemas/upsert-game-platinum.schema";

const router = Router();

router.put(
	"/users/me/games/:gameId/platinum",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(GamePlatinumParamsSchema, "params"),
		validateSchemaMiddleware(UpsertGamePlatinumSchema, "body")
	],
	gamePlatinumController.putPlatinum
);

router.delete(
	"/users/me/games/:gameId/platinum",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(GamePlatinumParamsSchema, "params")
	],
	gamePlatinumController.deletePlatinum
);

export default router;
