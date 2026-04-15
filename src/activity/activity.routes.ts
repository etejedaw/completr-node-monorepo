import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import * as activityController from "./activity.controller";

const router = Router();

router.get(
	"/feed",
	[rateLimiterMiddleware(userLimiter), authMiddleware()],
	activityController.getFeed
);

export default router;
