import { Router } from "express";

import { hiddenRouteMiddleware } from "../auth/hidden-route.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import * as jobsController from "./jobs.controller";
import { JobIdParamSchema } from "./schemas/job-id-params.schema";
import { PopulateExternalDataQuerySchema } from "./schemas/populate-external-data-query.schema";
import { PopulateRawgQuerySchema } from "./schemas/populate-rawg-query.schema";

const router = Router();

router.get(
	"/admin/jobs",
	[hiddenRouteMiddleware(), rateLimiterMiddleware(userLimiter)],
	jobsController.getJobs
);

router.post(
	"/admin/jobs/populate-rawg",
	[
		hiddenRouteMiddleware(),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(PopulateRawgQuerySchema, "query")
	],
	jobsController.postPopulateRawg
);

router.post(
	"/admin/jobs/populate-external-data",
	[
		hiddenRouteMiddleware(),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(PopulateExternalDataQuerySchema, "query")
	],
	jobsController.postPopulateExternalData
);

router.post(
	"/admin/jobs/calculate-ratings",
	[hiddenRouteMiddleware(), rateLimiterMiddleware(userLimiter)],
	jobsController.postCalculateRatings
);

router.post(
	"/admin/jobs/calculate-durations",
	[hiddenRouteMiddleware(), rateLimiterMiddleware(userLimiter)],
	jobsController.postCalculateDurations
);

router.post(
	"/admin/jobs/recompute-popularity",
	[hiddenRouteMiddleware(), rateLimiterMiddleware(userLimiter)],
	jobsController.postRecomputePopularity
);

router.post(
	"/admin/jobs/cleanup-coop-runs",
	[hiddenRouteMiddleware(), rateLimiterMiddleware(userLimiter)],
	jobsController.postCleanupCoopRuns
);

router.post(
	"/admin/jobs/rewind-freeze",
	[hiddenRouteMiddleware(), rateLimiterMiddleware(userLimiter)],
	jobsController.postRewindFreeze
);

router.delete(
	"/admin/jobs/:jobId",
	[
		hiddenRouteMiddleware(),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(JobIdParamSchema, "params")
	],
	jobsController.deleteJob
);

export default router;
