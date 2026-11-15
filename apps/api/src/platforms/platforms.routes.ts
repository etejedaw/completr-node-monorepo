import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import {
	publicLimiter,
	userLimiter
} from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import * as platformController from "./platforms.controller";
import { PlatformCodeParamSchema } from "./schemas/platform-code-params.schema";
import { PlatformIdParamSchema } from "./schemas/platformid-params.schema";
import { RegisterPlatformSchema } from "./schemas/register-platform.schema";
import { UpdatePlatformSchema } from "./schemas/update-platform.schema";

const router = Router();

router.get(
	"/platforms",
	[authMiddleware(), rateLimiterMiddleware(publicLimiter)],
	platformController.getAllPlatforms
);

router.get(
	"/platforms/:code",
	[
		authMiddleware(),
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(PlatformCodeParamSchema, "params")
	],
	platformController.getPlatformByCode
);

router.post(
	"/platforms",
	[
		authMiddleware("moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(RegisterPlatformSchema, "body")
	],
	platformController.postPlatform
);

router.patch(
	"/platforms/:platformId",
	[
		authMiddleware("moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(PlatformIdParamSchema, "params"),
		validateSchemaMiddleware(UpdatePlatformSchema, "body")
	],
	platformController.patchPlatform
);

router.delete(
	"/platforms/:platformId",
	[
		authMiddleware("moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(PlatformIdParamSchema, "params")
	],
	platformController.deletePlatform
);

export default router;
