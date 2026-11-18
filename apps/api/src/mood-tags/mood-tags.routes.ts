import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import { authOptionalMiddleware } from "../auth/auth-optional.middleware";
import {
	publicLimiter,
	userLimiter
} from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import * as moodTagsController from "./mood-tags.controller";
import { CreateTagSchema } from "./schemas/create-tag.schema";
import { GameIdParamsSchema } from "./schemas/game-id-params.schema";
import { PopularTagsQuerySchema } from "./schemas/popular-tags-query.schema";
import { ReplaceFavoriteTagsSchema } from "./schemas/replace-favorite-tags.schema";
import { ReplaceTagsSchema } from "./schemas/replace-tags.schema";
import { SearchTagsQuerySchema } from "./schemas/search-tags-query.schema";
import { TagGamesQuerySchema } from "./schemas/tag-games-query.schema";
import { TagNameParamsSchema } from "./schemas/tag-name-params.schema";
import { UpdateTagSchema } from "./schemas/update-tag.schema";

const router = Router();

router.get(
	"/users/me/mood-tags",
	[
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter)
	],
	moodTagsController.getMyTags
);

router.post(
	"/users/me/mood-tags",
	[
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(CreateTagSchema, "body")
	],
	moodTagsController.postTag
);

router.put(
	"/users/me/mood-tags/favorites",
	[
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(ReplaceFavoriteTagsSchema, "body")
	],
	moodTagsController.putFavoriteTags
);

router.get(
	"/users/me/games/:gameId/mood-tags",
	[
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(GameIdParamsSchema, "params")
	],
	moodTagsController.getGameTags
);

router.put(
	"/users/me/games/:gameId/mood-tags",
	[
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(GameIdParamsSchema, "params"),
		validateSchemaMiddleware(ReplaceTagsSchema, "body")
	],
	moodTagsController.putGameTags
);

router.patch(
	"/users/me/mood-tags/:tag",
	[
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(TagNameParamsSchema, "params"),
		validateSchemaMiddleware(UpdateTagSchema, "body")
	],
	moodTagsController.patchTag
);

router.delete(
	"/users/me/mood-tags/:tag",
	[
		authMiddleware("user", "premium", "moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(TagNameParamsSchema, "params")
	],
	moodTagsController.deleteTag
);

router.get(
	"/games/:gameId/tags",
	[
		authOptionalMiddleware,
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(GameIdParamsSchema, "params")
	],
	moodTagsController.getGameCommunityTags
);

router.get(
	"/tags/popular",
	[
		authOptionalMiddleware,
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(PopularTagsQuerySchema, "query")
	],
	moodTagsController.getPopularTags
);

router.get(
	"/tags/search",
	[
		authOptionalMiddleware,
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(SearchTagsQuerySchema, "query")
	],
	moodTagsController.getSearchTags
);

router.get(
	"/tags/:tag/games",
	[
		authOptionalMiddleware,
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(TagNameParamsSchema, "params"),
		validateSchemaMiddleware(TagGamesQuerySchema, "query")
	],
	moodTagsController.getTagGames
);

export default router;
