import { Router } from "express";
import * as moodTagsController from "./mood-tags.controller";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { authMiddleware } from "../auth/auth.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { ReplaceTagsSchema } from "./schemas/replace-tags.schema";
import { GameIdParamsSchema } from "./schemas/game-id-params.schema";
import { TagNameParamsSchema } from "./schemas/tag-name-params.schema";
import { UpdateTagSchema } from "./schemas/update-tag.schema";
import { CreateTagSchema } from "./schemas/create-tag.schema";

const router = Router();

router.get(
	"/users/me/mood-tags",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator")
	],
	moodTagsController.getMyTags
);

router.post(
	"/users/me/mood-tags",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(CreateTagSchema, "body")
	],
	moodTagsController.postTag
);

router.get(
	"/users/me/games/:gameId/mood-tags",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(GameIdParamsSchema, "params")
	],
	moodTagsController.getGameTags
);

router.put(
	"/users/me/games/:gameId/mood-tags",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(GameIdParamsSchema, "params"),
		validateSchemaMiddleware(ReplaceTagsSchema, "body")
	],
	moodTagsController.putGameTags
);

router.patch(
	"/users/me/mood-tags/:tag",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(TagNameParamsSchema, "params"),
		validateSchemaMiddleware(UpdateTagSchema, "body")
	],
	moodTagsController.patchTag
);

router.delete(
	"/users/me/mood-tags/:tag",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(TagNameParamsSchema, "params")
	],
	moodTagsController.deleteTag
);

export default router;
