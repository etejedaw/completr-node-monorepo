import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import * as gameExternalController from "./game-external.controller";
import { ExternalSlugParamSchema } from "./schemas/external-slug-params.schema";

const router = Router();

router.get(
	"/game-external/rawg/:slug",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("moderator"),
		validateSchemaMiddleware(ExternalSlugParamSchema, "params")
	],
	gameExternalController.getRawgBySlug
);

router.get(
	"/game-external/igdb/:slug",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("moderator"),
		validateSchemaMiddleware(ExternalSlugParamSchema, "params")
	],
	gameExternalController.getIgdbBySlug
);

export default router;
