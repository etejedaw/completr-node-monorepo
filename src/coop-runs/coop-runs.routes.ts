import { Router } from "express";
import * as coopController from "./coop-runs.controller";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { authMiddleware } from "../auth/auth.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { BacklogIdParamsSchema } from "./schemas/backlog-id-params.schema";
import { MemberParamsSchema } from "./schemas/member-params.schema";
import { AddMemberSchema } from "./schemas/add-member.schema";
import { SyncSchema } from "./schemas/sync.schema";
import { CandidatesQuerySchema } from "./schemas/candidates-query.schema";

const router = Router();

router.get(
	"/users/me/backlog/:backlogId/coop",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(BacklogIdParamsSchema, "params")
	],
	coopController.getMembers
);

router.get(
	"/users/me/backlog/:backlogId/coop/candidates",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(BacklogIdParamsSchema, "params"),
		validateSchemaMiddleware(CandidatesQuerySchema, "query")
	],
	coopController.getCandidates
);

router.post(
	"/users/me/backlog/:backlogId/coop",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(BacklogIdParamsSchema, "params"),
		validateSchemaMiddleware(AddMemberSchema, "body")
	],
	coopController.postMember
);

router.delete(
	"/users/me/backlog/:backlogId/coop/:userId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(MemberParamsSchema, "params")
	],
	coopController.deleteMember
);

router.post(
	"/users/me/backlog/:backlogId/coop/sync",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(BacklogIdParamsSchema, "params"),
		validateSchemaMiddleware(SyncSchema, "body")
	],
	coopController.postSync
);

export default router;
