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
import { PlatformIdParamSchema } from "./schemas/platformid-params.schema";

const router = Router();

router.get(
	"/platforms",
	[rateLimiterMiddleware(publicLimiter), authMiddleware()],
	platformController.getAllPlatforms
);

router.get(
	"/platforms/:code",
	[
		rateLimiterMiddleware(publicLimiter),
		authMiddleware(),
		validateSchemaMiddleware(PlatformCodeParamSchema, "params")
	],
	platformController.getPlatformByCode
);

router.post(
	"/platforms",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("moderator"),
		validateSchemaMiddleware(RegisterPlatformSchema, "body")
	],
	platformController.postPlatform
);

router.patch(
	"/platforms/:platformId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("moderator"),
		validateSchemaMiddleware(PlatformIdParamSchema, "params"),
		validateSchemaMiddleware(UpdatePlatformSchema, "body")
	],
	platformController.patchPlatform
);

router.delete(
	"/platforms/:platformId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("moderator"),
		validateSchemaMiddleware(PlatformIdParamSchema, "params")
	],
	platformController.deletePlatform
);

export default router;
