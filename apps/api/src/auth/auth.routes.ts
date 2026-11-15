import { Router } from "express";

import {
	authLimiter,
	passwordResetLimiter,
	publicLimiter,
	registerLimiter,
	userLimiter
} from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { PaginationQuerySchema } from "../common/schemas/pagination-query.schema";
import * as authController from "./auth.controller";
import { authMiddleware } from "./auth.middleware";
import {
	ChangePasswordSchema,
	ForgotPasswordSchema,
	LoginSchema,
	RefreshTokenSchema,
	RegisterSchema,
	ResetPasswordSchema
} from "./schemas";
import { SessionIdParamsSchema } from "./schemas/session-id-params.schema";

const router = Router();

router.post(
	"/auth/register",
	[
		authMiddleware("admin"),
		rateLimiterMiddleware(registerLimiter),
		validateSchemaMiddleware(RegisterSchema, "body")
	],
	authController.postRegister
);

router.post(
	"/auth/login",
	[
		rateLimiterMiddleware(authLimiter),
		validateSchemaMiddleware(LoginSchema, "body")
	],
	authController.postLogin
);

router.post(
	"/auth/refresh",
	[
		rateLimiterMiddleware(authLimiter),
		validateSchemaMiddleware(RefreshTokenSchema, "body")
	],
	authController.postRefresh
);

router.post(
	"/auth/logout",
	[
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(RefreshTokenSchema, "body")
	],
	authController.postLogout
);

router.patch(
	"/auth/password",
	[
		authMiddleware(),
		rateLimiterMiddleware(authLimiter),
		validateSchemaMiddleware(ChangePasswordSchema, "body")
	],
	authController.patchChangePassword
);

router.post(
	"/auth/forgot-password",
	[
		rateLimiterMiddleware(passwordResetLimiter),
		validateSchemaMiddleware(ForgotPasswordSchema, "body")
	],
	authController.postForgotPassword
);

router.post(
	"/auth/reset-password",
	[
		rateLimiterMiddleware(authLimiter),
		validateSchemaMiddleware(ResetPasswordSchema, "body")
	],
	authController.postResetPassword
);

router.get(
	"/auth/sessions",
	[
		authMiddleware(),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(PaginationQuerySchema, "query")
	],
	authController.getSessions
);

router.delete(
	"/auth/sessions/others/:sessionId",
	[
		authMiddleware(),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(SessionIdParamsSchema, "params")
	],
	authController.deleteOtherSessions
);

router.delete(
	"/auth/sessions/:sessionId",
	[
		authMiddleware(),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(SessionIdParamsSchema, "params")
	],
	authController.deleteSession
);

export default router;
