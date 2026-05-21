import { Router } from "express";
import * as backlogController from "./backlog.controller";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { authMiddleware } from "../auth/auth.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { RegisterBacklogSchema } from "./schemas/register-backlog.schema";
import { UpdateBacklogSchema } from "./schemas/update-backlog.schema";
import { BacklogIdParamsSchema } from "./schemas/backlog-id-params.schema";
import { BacklogQuerySchema } from "./schemas/backlog-query.schema";

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

router.get(
	"/stats",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator")
	],
	backlogController.getMeBacklogStats
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
