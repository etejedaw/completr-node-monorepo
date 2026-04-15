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
import listItemsRouter from "./list-items/list-items.routes";
import listFollowersRouter from "./list-followers/list-followers.routes";
import scoreSourcesRouter from "./score-sources/score-sources.routes";
import gameExternalRouter from "./game-external/game-external.routes";
import gameReportsRouter from "./game-reports/game-reports.routes";
import userFollowersRouter from "./user-followers/user-followers.routes";
import activityRouter from "./activity/activity.routes";
import auditRouter from "./audit/audit.routes";
import { corsConfig } from "./common/config/cors.config";
import { errorHandlerMiddleware } from "./common/middlewares/error-handler.middleware";
import { correlationIdMiddleware } from "./common/middlewares/correlation-id.middleware";
import { loggerMiddleware } from "./common/middlewares/logger.middleware";
import { securityTxtMiddleware } from "./common/middlewares/security-txt.middleware";

export function server(port: number) {
	const app = express();

	app.use(express.json());
	app.use(helmet());
	app.use(cors(corsConfig));

	app.use(securityTxtMiddleware);
	app.use(correlationIdMiddleware);
	app.use(loggerMiddleware);
	app.use(authRouter);
	app.use(usersRoute);
	app.use(gamesRouter);
	app.use(platformRouter);
	app.use(genreRouter);
	app.use(gameScoresRouter);
	app.use(gameTimesRouter);
	app.use(listFollowersRouter);
	app.use(listsRouter);
	app.use(listItemsRouter);
	app.use(scoreSourcesRouter);
	app.use(gameExternalRouter);
	app.use(gameReportsRouter);
	app.use(userFollowersRouter);
	app.use(activityRouter);
	app.use(auditRouter);
	app.use(errorHandlerMiddleware);

	app.listen(port, () => console.log(`Server running on port ${port}`));
}
