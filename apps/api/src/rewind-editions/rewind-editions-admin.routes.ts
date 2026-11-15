import { Router } from "express";

import { hiddenRouteMiddleware } from "../auth/hidden-route.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import * as rewindEditionsAdminController from "./rewind-editions-admin.controller";
import { CreateRewindEditionSchema } from "./schemas/create-rewind-edition.schema";
import { RewindEditionYearParamsSchema } from "./schemas/rewind-edition-year-params.schema";
import { UpdateRewindEditionSchema } from "./schemas/update-rewind-edition.schema";

const router = Router();
const adminMiddleware = [
	rateLimiterMiddleware(userLimiter),
	hiddenRouteMiddleware()
];

router.get(
	"/admin/rewind/editions",
	adminMiddleware,
	rewindEditionsAdminController.getRewindEditions
);
router.post(
	"/admin/rewind/editions",
	[
		...adminMiddleware,
		validateSchemaMiddleware(CreateRewindEditionSchema, "body")
	],
	rewindEditionsAdminController.postRewindEdition
);
router.put(
	"/admin/rewind/editions/:year",
	[
		...adminMiddleware,
		validateSchemaMiddleware(RewindEditionYearParamsSchema, "params"),
		validateSchemaMiddleware(UpdateRewindEditionSchema, "body")
	],
	rewindEditionsAdminController.putRewindEdition
);

export default router;
