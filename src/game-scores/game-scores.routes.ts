import { Router } from "express";
import * as gameScoresController from "./game-scores.controller";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { authMiddleware } from "../auth/auth.middleware";

const router = Router();

router.post(
	"/game-scores",
	[rateLimiterMiddleware(userLimiter), authMiddleware("moderator")],
	gameScoresController.postGameScore
);

router.get(
	"/game-scores/:gameId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator")
	],
	gameScoresController.getGameScores
);

export default router;
