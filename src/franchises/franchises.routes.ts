import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import { authOptionalMiddleware } from "../auth/auth-optional.middleware";
import {
	publicLimiter,
	userLimiter
} from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { PaginatedSearchQuerySchema } from "../common/schemas/paginated-search-query.schema";
import { PaginationQuerySchema } from "../common/schemas/pagination-query.schema";
import * as franchiseController from "./franchises.controller";
import { FranchiseCodeParamsSchema } from "./schemas/franchise-code-params.schema";
import { FranchiseIdParamSchema } from "./schemas/franchise-id-params.schema";
import { RegisterFranchiseSchema } from "./schemas/register-franchise.schema";
import { UpdateFranchiseSchema } from "./schemas/update-franchise.schema";

const router = Router();

router.get(
	"/franchises",
	[
		rateLimiterMiddleware(publicLimiter),
		authMiddleware(),
		validateSchemaMiddleware(PaginatedSearchQuerySchema, "query")
	],
	franchiseController.getAllFranchises
);

router.get(
	"/franchises/:code",
	[
		rateLimiterMiddleware(publicLimiter),
		authOptionalMiddleware,
		validateSchemaMiddleware(FranchiseCodeParamsSchema, "params"),
		validateSchemaMiddleware(PaginationQuerySchema, "query")
	],
	franchiseController.getFranchiseByCode
);

router.post(
	"/franchises",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("moderator"),
		validateSchemaMiddleware(RegisterFranchiseSchema, "body")
	],
	franchiseController.postFranchise
);

router.patch(
	"/franchises/:franchiseId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("moderator"),
		validateSchemaMiddleware(FranchiseIdParamSchema, "params"),
		validateSchemaMiddleware(UpdateFranchiseSchema, "body")
	],
	franchiseController.patchFranchise
);

router.delete(
	"/franchises/:franchiseId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("moderator"),
		validateSchemaMiddleware(FranchiseIdParamSchema, "params")
	],
	franchiseController.deleteFranchise
);

export default router;
