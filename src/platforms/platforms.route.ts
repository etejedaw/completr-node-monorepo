import { Router } from "express";
import * as platformController from "./platforms.controller";
import { authMiddleware } from "../auth/auth.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { RegisterPlatformSchema } from "./schemas/register-platform.schema";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import {
	publicLimiter,
	userLimiter
} from "../common/config/rate-limiter.config";
import { PlatformCodeParamSchema } from "./schemas/platform-code-params.schema";
import { UpdatePlatformSchema } from "./schemas/update-platform.schema";
import { PlatformIdCodeParamSchema } from "./schemas/platformid-params.schema";

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
		rateLimiterMiddleware(userLimiter),
		authMiddleware("moderator"),
		validateSchemaMiddleware(RegisterPlatformSchema, "body")
	],
	platformController.postPlatform
);

router.patch(
	"/platform/:id",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("moderator"),
		validateSchemaMiddleware(UpdatePlatformSchema, "body")
	],
	platformController.patchPlatform
);

router.delete(
	"/platform/:id",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("moderator"),
		validateSchemaMiddleware(PlatformIdCodeParamSchema, "params")
	],
	platformController.deletePlatform
);

export default router;
