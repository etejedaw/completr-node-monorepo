import { Router } from "express";
import { type ZodType } from "zod";

import { authMiddleware } from "../auth/auth.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { exportFormatAccessMiddleware } from "../common/middlewares/export-format-access.middleware";
import { exportFormatNegotiationMiddleware } from "../common/middlewares/export-format-negotiation.middleware";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateBulkBodyMiddleware } from "../common/middlewares/validate-bulk-body.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { ExportPlatformSearchQuerySchema } from "../common/schemas/export-platform-search-query.schema";
import { PaginatedSearchQuerySchema } from "../common/schemas/paginated-search-query.schema";
import * as gameShelfController from "./game-shelf.controller";
import { BulkDeleteGameShelfSchema } from "./schemas/bulk-delete-game-shelf.schema";
import {
	type GameShelfBulkQuery,
	GameShelfBulkQuerySchema
} from "./schemas/game-shelf-bulk-query.schema";
import { GameShelfIdParamSchema } from "./schemas/game-shelf-id-params.schema";
import { RegisterGameShelfSchema } from "./schemas/register-game-shelf.schema";
import { UpdateGameShelfSchema } from "./schemas/update-game-shelf.schema";

const router = Router({ mergeParams: true });

router.post(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(RegisterGameShelfSchema, "body")
	],
	gameShelfController.postGameShelf
);

router.post(
	"/bulk",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(GameShelfBulkQuerySchema, "query"),
		validateBulkBodyMiddleware({
			delete: BulkDeleteGameShelfSchema
		} satisfies Record<GameShelfBulkQuery["action"], ZodType>)
	],
	gameShelfController.postGameShelfBulk
);

router.get(
	"/",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(PaginatedSearchQuerySchema, "query")
	],
	gameShelfController.getMeGameShelf
);

router.patch(
	"/:gameShelfId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(GameShelfIdParamSchema, "params"),
		validateSchemaMiddleware(UpdateGameShelfSchema, "body")
	],
	gameShelfController.patchGameShelf
);

router.delete(
	"/:gameShelfId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(GameShelfIdParamSchema, "params")
	],
	gameShelfController.deleteGameShelf
);

router.get(
	"/export",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(ExportPlatformSearchQuerySchema, "query"),
		exportFormatNegotiationMiddleware,
		exportFormatAccessMiddleware
	],
	gameShelfController.getMeGameShelfExport
);

export default router;
