import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import activityRouter from "./activity/activity.routes";
import auditRouter from "./audit/audit.routes";
import authRouter from "./auth/auth.router";
import backlogProgressRouter from "./backlog-progress/backlog-progress.routes";
import changelogRouter from "./changelog/changelog.routes";
import { corsConfig } from "./common/config/cors.config";
import { correlationIdMiddleware } from "./common/middlewares/correlation-id.middleware";
import { errorHandlerMiddleware } from "./common/middlewares/error-handler.middleware";
import { loggerMiddleware } from "./common/middlewares/logger.middleware";
import coopRunsRouter from "./coop-runs/coop-runs.routes";
import gameExternalRouter from "./game-external/game-external.routes";
import gameReportsRouter from "./game-reports/game-reports.routes";
import gameScoresRouter from "./game-scores/game-scores.routes";
import gameTimesRouter from "./game-times/game-times.routes";
import gamesRouter from "./games/games.routes";
import genreRouter from "./genres/genres.routes";
import jobsRouter from "./jobs/jobs.routes";
import listFollowersRouter from "./list-followers/list-followers.routes";
import listItemsRouter from "./list-items/list-items.routes";
import listsRouter from "./lists/lists.routes";
import moodTagsRouter from "./mood-tags/mood-tags.routes";
import platformRouter from "./platforms/platforms.routes";
import scoreSourcesRouter from "./score-sources/score-sources.routes";
import userFollowRequestsRouter from "./user-follow-requests/user-follow-requests.routes";
import userFollowersRouter from "./user-followers/user-followers.routes";
import usersRoute from "./users/users.routes";
import wellKnownRouter from "./well-known/well-known.routes";

export function server(port: number) {
	const app = express();

	app.use(express.json());
	app.use(cookieParser());
	app.use(helmet());
	app.use(cors(corsConfig));

	app.use(wellKnownRouter);
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
	app.use(userFollowRequestsRouter);
	app.use(activityRouter);
	app.use(auditRouter);
	app.use(jobsRouter);
	app.use(moodTagsRouter);
	app.use(backlogProgressRouter);
	app.use(coopRunsRouter);
	app.use(changelogRouter);
	app.use(errorHandlerMiddleware);

	app.listen(port, () => console.log(`Server running on port ${port}`));
}
