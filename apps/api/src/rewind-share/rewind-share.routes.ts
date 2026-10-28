import { Router } from "express";

import { authOptionalMiddleware } from "../auth/auth-optional.middleware";
import { publicLimiter } from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { RewindYearParamsSchema } from "../rewind/rewind-year-params.schema";
import * as rewindShareController from "./rewind-share.controller";

const router = Router();

router.get(
	"/users/:username/rewinds/:year/story.png",
	[
		rateLimiterMiddleware(publicLimiter),
		authOptionalMiddleware,
		validateSchemaMiddleware(RewindYearParamsSchema, "params")
	],
	rewindShareController.getRewindStoryImage
);

router.get(
	"/users/:username/rewinds/:year/og.png",
	[
		rateLimiterMiddleware(publicLimiter),
		authOptionalMiddleware,
		validateSchemaMiddleware(RewindYearParamsSchema, "params")
	],
	rewindShareController.getRewindOgImage
);

router.get(
	"/share/rewind/:username/:year",
	[
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(RewindYearParamsSchema, "params")
	],
	rewindShareController.getRewindSharePage
);

export default router;
