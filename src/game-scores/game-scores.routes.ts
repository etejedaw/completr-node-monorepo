import { Router } from "express";
import * as gameScoresController from "./game-scores.controller";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { authMiddleware } from "../auth/auth.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { RegisterGameScoreSchema } from "./schemas/register-game-score.schema";
import { GameScoreParamsSchema } from "./schemas/game-score-params.schema";

const router = Router();

router.post(
	"/game-scores",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("moderator"),
		validateSchemaMiddleware(RegisterGameScoreSchema, "body")
	],
	gameScoresController.postGameScore
);

router.get(
	"/game-scores/:gameId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(GameScoreParamsSchema, "params")
	],
	gameScoresController.getGameScores
);

export default router;
