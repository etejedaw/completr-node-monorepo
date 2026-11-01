import { Router } from "express";

import { hiddenRouteMiddleware } from "../auth/hidden-route.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { UserIdParamSchema } from "../users/schemas/user-id-params.schema";
import * as premiumAccessAdminController from "./premium-access-admin.controller";
import {
	CreatePremiumGrantSchema,
	PremiumGrantParamsSchema,
	UpdatePremiumGrantSchema
} from "./schemas/premium-grant.schemas";

const router = Router();
const adminMiddleware = [
	rateLimiterMiddleware(userLimiter),
	hiddenRouteMiddleware()
];

router.get(
	"/admin/premium-features",
	adminMiddleware,
	premiumAccessAdminController.getPremiumFeatures
);
router.get(
	"/admin/users/:userId/premium-grants",
	[...adminMiddleware, validateSchemaMiddleware(UserIdParamSchema, "params")],
	premiumAccessAdminController.getPremiumGrants
);
router.post(
	"/admin/users/:userId/premium-grants",
	[
		...adminMiddleware,
		validateSchemaMiddleware(UserIdParamSchema, "params"),
		validateSchemaMiddleware(CreatePremiumGrantSchema, "body")
	],
	premiumAccessAdminController.postPremiumGrant
);
router.patch(
	"/admin/users/:userId/premium-grants/:grantId",
	[
		...adminMiddleware,
		validateSchemaMiddleware(PremiumGrantParamsSchema, "params"),
		validateSchemaMiddleware(UpdatePremiumGrantSchema, "body")
	],
	premiumAccessAdminController.patchPremiumGrant
);
router.post(
	"/admin/users/:userId/premium-grants/:grantId/revoke",
	[
		...adminMiddleware,
		validateSchemaMiddleware(PremiumGrantParamsSchema, "params")
	],
	premiumAccessAdminController.postRevokePremiumGrant
);

export default router;
