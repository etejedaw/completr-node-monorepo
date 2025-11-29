import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware";
import { validateSchemaMiddleware } from "../common/middlewares/validate-schema.middleware";
import { RegisterGameSchema } from "./schemas/register-game.schema";
import * as gamesController from "./game.controller";

const router = Router();

router.post(
	"/games",
	[
		authMiddleware("moderator"),
		validateSchemaMiddleware(RegisterGameSchema, "body")
	],
	gamesController.postGame
);

export default router;
