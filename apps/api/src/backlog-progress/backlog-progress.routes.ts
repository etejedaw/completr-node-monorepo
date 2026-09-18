import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import * as backlogProgressController from "./backlog-progress.controller";
import { AddProgressSchema } from "./schemas/add-progress.schema";
import { BacklogIdParamsSchema } from "./schemas/backlog-id-params.schema";
import { NoteIdParamsSchema } from "./schemas/note-id-params.schema";

const router = Router();

router.get(
	"/users/me/backlog/:backlogId/progress",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(BacklogIdParamsSchema, "params")
	],
	backlogProgressController.getProgress
);

router.post(
	"/users/me/backlog/:backlogId/progress",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(BacklogIdParamsSchema, "params"),
		validateSchemaMiddleware(AddProgressSchema, "body")
	],
	backlogProgressController.postProgress
);

router.delete(
	"/users/me/backlog/:backlogId/progress/:noteId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(NoteIdParamsSchema, "params")
	],
	backlogProgressController.deleteProgress
);

export default router;
