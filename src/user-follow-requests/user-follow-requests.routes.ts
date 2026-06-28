import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { UsernameParamSchema } from "../users/schemas/username-params.schema";
import { RequesterIdParamSchema } from "./schemas/requester-id-params.schema";
import * as controller from "./user-follow-requests.controller";

const router = Router();

router.get(
	"/users/me/follow-requests",
	[rateLimiterMiddleware(userLimiter), authMiddleware()],
	controller.getIncomingRequests
);

router.post(
	"/users/me/follow-requests/:requesterId/accept",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware(),
		validateSchemaMiddleware(RequesterIdParamSchema, "params")
	],
	controller.postAcceptRequest
);

router.post(
	"/users/me/follow-requests/:requesterId/reject",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware(),
		validateSchemaMiddleware(RequesterIdParamSchema, "params")
	],
	controller.postRejectRequest
);

router.delete(
	"/users/me/follow-requests/sent/:username",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware(),
		validateSchemaMiddleware(UsernameParamSchema, "params")
	],
	controller.deleteOutgoingRequest
);

export default router;
