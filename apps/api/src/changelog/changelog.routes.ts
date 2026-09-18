import { Router } from "express";

import { publicLimiter } from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import * as changelogController from "./changelog.controller";

const router = Router();

router.get(
	"/changelog",
	[rateLimiterMiddleware(publicLimiter)],
	changelogController.getChangelog
);

export default router;
