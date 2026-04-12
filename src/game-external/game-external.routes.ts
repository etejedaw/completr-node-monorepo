import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { RawgSlugParamSchema } from "./schemas/rawg-slug-params.schema";
import * as gameExternalController from "./game-external.controller";

const router = Router();

router.get(
	"/game-external/rawg/:slug",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("moderator"),
		validateSchemaMiddleware(RawgSlugParamSchema, "params")
	],
	gameExternalController.getRawgBySlug
);

export default router;
