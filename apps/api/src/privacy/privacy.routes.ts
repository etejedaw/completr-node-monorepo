import { Router } from "express";

import { publicLimiter } from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import * as privacyController from "./privacy.controller";

const router = Router();

router.get(
	"/privacy",
	[rateLimiterMiddleware(publicLimiter)],
	privacyController.getPrivacyPolicy
);

export default router;
