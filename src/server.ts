import express from "express";
import helmet from "helmet";
import cors from "cors";
import usersRoute from "./users/users.routes";
import authRouter from "./auth/auth.router";
import { corsConfig } from "./common/config/cors.config";
import { errorHandlerMiddleware } from "./common/middlewares/error-handler.middleware";
import { correlationIdMiddleware } from "./common/middlewares/correlation-id.middleware";

export function server(port: number) {
	const app = express();

	app.use(express.json());
	app.use(helmet());
	app.use(cors(corsConfig));

	app.use(correlationIdMiddleware);
	app.use(authRouter);
	app.use(usersRoute);
	app.use(errorHandlerMiddleware);

	app.listen(port, () => console.log(`Server running on port ${port}`));
}
