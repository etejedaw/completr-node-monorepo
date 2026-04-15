import { Router } from "express";
import * as jobsController from "./jobs.controller";
import { authMiddleware } from "../auth/auth.middleware";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";

const router = Router();

router.get(
	"/admin/jobs",
	[rateLimiterMiddleware(userLimiter), authMiddleware("admin")],
	jobsController.getJobs
);

router.post(
	"/admin/jobs/populate-rawg",
	[rateLimiterMiddleware(userLimiter), authMiddleware("admin")],
	jobsController.postPopulateRawg
);

export default router;
