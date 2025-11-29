import { Router } from "express";
import * as platformController from "./platforms.controller";
import { authMiddleware } from "../auth/auth.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { RegisterPlatformSchema } from "./schemas/register-platform.schema";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { publicLimiter } from "../common/config/rate-limiter.config";
import { PlatformCodeParamSchema } from "./schemas/platform-code-params.schema";

const router = Router();

router.get(
	"/platform",
	rateLimiterMiddleware(publicLimiter),
	platformController.getAllPlatforms
);

router.get(
	"/platform/:code",
	[
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(PlatformCodeParamSchema, "params")
	],
	platformController.getPlatformByCode
);

router.post(
	"/platform",
	[
		authMiddleware("admin"),
		validateSchemaMiddleware(RegisterPlatformSchema, "body")
	],
	platformController.postPlatform
);

export default router;
