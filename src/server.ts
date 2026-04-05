import express from "express";
import helmet from "helmet";
import cors from "cors";
import usersRoute from "./users/users.routes";
import authRouter from "./auth/auth.router";
import gamesRouter from "./games/games.routes";
import platformRouter from "./platforms/platforms.routes";
import genreRouter from "./genres/genres.routes";
import gameScoresRouter from "./game-scores/game-scores.routes";
import gameTimesRouter from "./game-times/game-times.routes";
import listsRouter from "./lists/lists.routes";
import { corsConfig } from "./common/config/cors.config";
import { errorHandlerMiddleware } from "./common/middlewares/error-handler.middleware";
import { correlationIdMiddleware } from "./common/middlewares/correlation-id.middleware";
import { loggerMiddleware } from "./common/middlewares/logger.middleware";

export function server(port: number) {
	const app = express();

	app.use(express.json());
	app.use(helmet());
	app.use(cors(corsConfig));

	app.use(correlationIdMiddleware);
	app.use(loggerMiddleware);
	app.use(authRouter);
	app.use(usersRoute);
	app.use(gamesRouter);
	app.use(platformRouter);
	app.use(genreRouter);
	app.use(gameScoresRouter);
	app.use(gameTimesRouter);
	app.use(listsRouter);
	app.use(errorHandlerMiddleware);

	app.listen(port, () => console.log(`Server running on port ${port}`));
}
