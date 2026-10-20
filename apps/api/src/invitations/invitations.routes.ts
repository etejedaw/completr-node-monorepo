import { Router } from "express";

import { hiddenRouteMiddleware } from "../auth/hidden-route.middleware";
import {
	publicLimiter,
	registerLimiter,
	userLimiter
} from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import * as invitationsController from "./invitations.controller";
import { AcceptInvitationSchema } from "./schemas/accept-invitation.schema";
import { CreateInvitationSchema } from "./schemas/create-invitation.schema";
import { InvitationIdParamSchema } from "./schemas/invitation-id-params.schema";
import { InvitationTokenParamSchema } from "./schemas/invitation-token-params.schema";

const router = Router();

router.post(
	"/admin/invitations",
	[
		rateLimiterMiddleware(registerLimiter),
		hiddenRouteMiddleware(),
		validateSchemaMiddleware(CreateInvitationSchema, "body")
	],
	invitationsController.postInvitation
);

router.get(
	"/admin/invitations",
	[rateLimiterMiddleware(userLimiter), hiddenRouteMiddleware()],
	invitationsController.getInvitations
);

router.delete(
	"/admin/invitations/:invitationId",
	[
		rateLimiterMiddleware(userLimiter),
		hiddenRouteMiddleware(),
		validateSchemaMiddleware(InvitationIdParamSchema, "params")
	],
	invitationsController.deleteInvitation
);

router.post(
	"/invitations/accept",
	[
		rateLimiterMiddleware(registerLimiter),
		validateSchemaMiddleware(AcceptInvitationSchema, "body")
	],
	invitationsController.postAcceptInvitation
);

router.get(
	"/invitations/:token",
	[
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(InvitationTokenParamSchema, "params")
	],
	invitationsController.getInvitationByToken
);

export default router;
