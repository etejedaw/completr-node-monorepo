import { Router } from "express";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import {
	ChangePasswordSchema,
	LoginSchema,
	RegisterSchema,
	RefreshTokenSchema
} from "./schemas";
import * as authController from "./auth.controller";
import { authMiddleware } from "./auth.middleware";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import {
	authLimiter,
	registerLimiter
} from "../common/config/rate-limiter.config";

const router = Router();

router.post(
	"/auth/register",
	[
		rateLimiterMiddleware(registerLimiter),
		authMiddleware("admin"),
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
	[validateSchemaMiddleware(RefreshTokenSchema, "body")],
	authController.postLogout
);

router.patch(
	"/auth/password",
	[
		rateLimiterMiddleware(authLimiter),
		authMiddleware(),
		validateSchemaMiddleware(ChangePasswordSchema, "body")
	],
	authController.patchChangePassword
);

export default router;
