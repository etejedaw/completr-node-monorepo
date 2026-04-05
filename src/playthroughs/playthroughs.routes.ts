import { Router } from "express";
import * as playthroughsController from "./playthroughs.controller";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { userLimiter } from "../common/config/rate-limiter.config";
import { authMiddleware } from "../auth/auth.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { RegisterPlaythroughSchema } from "./schemas/register-playthrough.schema";
import { UpdatePlaythroughSchema } from "./schemas/update-playthrough.schema";
import { PlaythroughIdParamsSchema } from "./schemas/playthrough-id-params.schema";
import { PlaythroughQuerySchema } from "./schemas/playthrough-query.schema";

const router = Router();

router.post(
	"/playthroughs",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(RegisterPlaythroughSchema, "body")
	],
	playthroughsController.postPlaythrough
);

router.get(
	"/playthroughs",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(PlaythroughQuerySchema, "query")
	],
	playthroughsController.getMyPlaythroughs
);

router.patch(
	"/playthroughs/:playthroughId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(PlaythroughIdParamsSchema, "params"),
		validateSchemaMiddleware(UpdatePlaythroughSchema, "body")
	],
	playthroughsController.patchPlaythrough
);

router.delete(
	"/playthroughs/:playthroughId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("user", "premium", "moderator"),
		validateSchemaMiddleware(PlaythroughIdParamsSchema, "params")
	],
	playthroughsController.deletePlaythrough
);

export default router;
