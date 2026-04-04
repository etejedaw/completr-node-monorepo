import { Router } from "express";
import * as genreController from "./genres.controller";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import {
	publicLimiter,
	userLimiter
} from "../common/config/rate-limiter.config";
import { authMiddleware } from "../auth/auth.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { GenreCodeParamsSchema } from "./schemas/genre-code-params.schema";
import { RegisterGenreSchema } from "./schemas/register-genre.schema";
import { UpdateGenreSchema } from "./schemas/update-genre.schema";
import { GenreIdParamSchema } from "./schemas/genre-id-params.schema";

const router = Router();

router.get(
	"/genres",
	[rateLimiterMiddleware(publicLimiter)],
	genreController.getAllGenres
);

router.get(
	"/genres/:code",
	[
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(GenreCodeParamsSchema, "params")
	],
	genreController.getGenreByCode
);

router.get(
	"/genres/:code/games",
	[
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(GenreCodeParamsSchema, "params")
	],
	genreController.getGamesByGenre
);

router.post(
	"/genres",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("moderator"),
		validateSchemaMiddleware(RegisterGenreSchema, "body")
	],
	genreController.postGenre
);

router.patch(
	"/genres/:genreId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("moderator"),
		validateSchemaMiddleware(GenreIdParamSchema, "params"),
		validateSchemaMiddleware(UpdateGenreSchema, "body")
	],
	genreController.patchGenre
);

router.delete(
	"/genres/:genreId",
	[
		rateLimiterMiddleware(userLimiter),
		authMiddleware("moderator"),
		validateSchemaMiddleware(GenreIdParamSchema, "params")
	],
	genreController.deleteGenre
);

export default router;
