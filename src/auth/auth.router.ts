import { Router } from "express";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { ChangePasswordSchema, LoginSchema, RegisterSchema } from "./schemas";
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
router.patch(
	"/auth/password",
	[
		rateLimiterMiddleware(authLimiter),
		authMiddleware,
		validateSchemaMiddleware(ChangePasswordSchema, "body")
	],
	authController.patchChangePassword
);

export default router;
