import { Router } from "express";
import * as changelogController from "./changelog.controller";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { publicLimiter } from "../common/config/rate-limiter.config";

const router = Router();

router.get(
	"/changelog",
	[rateLimiterMiddleware(publicLimiter)],
	changelogController.getChangelog
);

export default router;
