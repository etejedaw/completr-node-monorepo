import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { RegisterGameSchema } from "./schemas/register-game.schema";
import * as gamesController from "./games.controller";
import { UpdateGameSchema } from "./schemas/update-game.schema";
import { GameIdParamSchema } from "./schemas/game-id-params.schema";

const router = Router();

router.get("/games/:code", gamesController.getGameByCode);

router.post(
	"/games",
	[
		authMiddleware("moderator"),
		validateSchemaMiddleware(RegisterGameSchema, "body")
	],
	gamesController.postGame
);

router.patch(
	"/games/:id",
	[
		authMiddleware("moderator"),
		validateSchemaMiddleware(GameIdParamSchema, "params"),
		validateSchemaMiddleware(UpdateGameSchema, "body")
	],
	gamesController.patchGame
);

router.delete(
	"/games/:id",
	[
		authMiddleware("moderator"),
		validateSchemaMiddleware(GameIdParamSchema, "params")
	],
	gamesController.deleteGame
);

export default router;
