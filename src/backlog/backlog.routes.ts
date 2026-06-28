import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import * as backlogController from "./backlog.controller";
import { BacklogIdParamsSchema } from "./schemas/backlog-id-params.schema";
import { BacklogQuerySchema } from "./schemas/backlog-query.schema";
import { RegisterBacklogSchema } from "./schemas/register-backlog.schema";
import { UpdateBacklogSchema } from "./schemas/update-backlog.schema";

const router = Router({ mergeParams: true });

router.post(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(RegisterBacklogSchema, "body")
	],
	backlogController.postBacklog
);

router.get(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(BacklogQuerySchema, "query")
	],
	backlogController.getMeBacklog
);

router.patch(
	"/:backlogId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(BacklogIdParamsSchema, "params"),
		validateSchemaMiddleware(UpdateBacklogSchema, "body")
	],
	backlogController.patchBacklog
);

router.delete(
	"/:backlogId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(BacklogIdParamsSchema, "params")
	],
	backlogController.deleteBacklog
);

export default router;
