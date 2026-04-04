import { Router } from "express";
import * as gameTimesController from "./game-times.controller";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { authMiddleware } from "../auth/auth.middleware";

const router = Router();

router.post(
	"/game-times",
	[rateLimiterMiddleware(userLimiter), authMiddleware("moderator")],
	gameTimesController.postGameTime
);

router.get(
	"/game-times/:gameId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator")
	],
	gameTimesController.getGameTimes
);

export default router;
