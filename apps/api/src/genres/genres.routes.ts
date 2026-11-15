import { Router } from "express";

import { authMiddleware } from "../auth/auth.middleware";
import {
	publicLimiter,
	userLimiter
} from "../common/config/rate-limiter.config";
import { rateLimiterMiddleware } from "../common/middlewares/rate-limiter.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { PaginationQuerySchema } from "../common/schemas/pagination-query.schema";
import * as genreController from "./genres.controller";
import { GenreCodeParamsSchema } from "./schemas/genre-code-params.schema";
import { GenreIdParamSchema } from "./schemas/genre-id-params.schema";
import { RegisterGenreSchema } from "./schemas/register-genre.schema";
import { UpdateGenreSchema } from "./schemas/update-genre.schema";

const router = Router();

router.get(
	"/genres",
	[authMiddleware(), rateLimiterMiddleware(publicLimiter)],
	genreController.getAllGenres
);

router.get(
	"/genres/:code",
	[
		authMiddleware(),
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(GenreCodeParamsSchema, "params")
	],
	genreController.getGenreByCode
);

router.get(
	"/genres/:code/games",
	[
		authMiddleware(),
		rateLimiterMiddleware(publicLimiter),
		validateSchemaMiddleware(GenreCodeParamsSchema, "params"),
		validateSchemaMiddleware(PaginationQuerySchema, "query")
	],
	genreController.getGamesByGenre
);

router.post(
	"/genres",
	[
		authMiddleware("moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(RegisterGenreSchema, "body")
	],
	genreController.postGenre
);

router.patch(
	"/genres/:genreId",
	[
		authMiddleware("moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(GenreIdParamSchema, "params"),
		validateSchemaMiddleware(UpdateGenreSchema, "body")
	],
	genreController.patchGenre
);

router.delete(
	"/genres/:genreId",
	[
		authMiddleware("moderator"),
		rateLimiterMiddleware(userLimiter),
		validateSchemaMiddleware(GenreIdParamSchema, "params")
	],
	genreController.deleteGenre
);

export default router;
