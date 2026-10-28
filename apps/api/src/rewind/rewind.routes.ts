import { Router } from "express";

import { authOptionalMiddleware } from "../auth/auth-optional.middleware";
import { publicLimiter } from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { UsernameParamSchema } from "../users/schemas/username-params.schema";
import * as rewindController from "./rewind.controller";
import { RewindYearParamsSchema } from "./rewind-year-params.schema";

const router = Router();

router.get(
	"/users/:username/rewinds",
	[
		rateLimiterMiddleware(publicLimiter),
		authOptionalMiddleware,
		validateSchemaMiddleware(UsernameParamSchema, "params")
	],
	rewindController.getUserRewinds
);

router.get(
	"/users/:username/rewinds/:year",
	[
		rateLimiterMiddleware(publicLimiter),
		authOptionalMiddleware,
		validateSchemaMiddleware(RewindYearParamsSchema, "params")
	],
	rewindController.getUserRewind
);

export default router;
