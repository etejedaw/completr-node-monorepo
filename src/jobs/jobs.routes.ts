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

router.post(
	"/admin/jobs/calculate-ratings",
	[rateLimiterMiddleware(userLimiter), authMiddleware("admin")],
	jobsController.postCalculateRatings
);

router.post(
	"/admin/jobs/calculate-durations",
	[rateLimiterMiddleware(userLimiter), authMiddleware("admin")],
	jobsController.postCalculateDurations
);

router.delete(
	"/admin/jobs/:jobId",
	[rateLimiterMiddleware(userLimiter), authMiddleware("admin")],
	jobsController.deleteJob
);

export default router;
