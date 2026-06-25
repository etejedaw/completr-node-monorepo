import { Router } from "express";
import * as jobsController from "./jobs.controller";
import { hiddenRouteMiddleware } from "../auth/hidden-route.middleware";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";

const router = Router();

router.get(
	"/admin/jobs",
	[rateLimiterMiddleware(userLimiter), hiddenRouteMiddleware()],
	jobsController.getJobs
);

router.post(
	"/admin/jobs/populate-rawg",
	[rateLimiterMiddleware(userLimiter), hiddenRouteMiddleware()],
	jobsController.postPopulateRawg
);

router.post(
	"/admin/jobs/calculate-ratings",
	[rateLimiterMiddleware(userLimiter), hiddenRouteMiddleware()],
	jobsController.postCalculateRatings
);

router.post(
	"/admin/jobs/calculate-durations",
	[rateLimiterMiddleware(userLimiter), hiddenRouteMiddleware()],
	jobsController.postCalculateDurations
);

router.post(
	"/admin/jobs/recompute-popularity",
	[rateLimiterMiddleware(userLimiter), hiddenRouteMiddleware()],
	jobsController.postRecomputePopularity
);

router.delete(
	"/admin/jobs/:jobId",
	[rateLimiterMiddleware(userLimiter), hiddenRouteMiddleware()],
	jobsController.deleteJob
);

export default router;
