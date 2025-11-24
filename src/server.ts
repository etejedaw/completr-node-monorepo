import express from "express";
import helmet from "helmet";
import cors from "cors";
import usersRoute from "./users/users.routes";
import authRouter from "./auth/auth.router";
import { corsConfig } from "./common/config/cors.config";

export function server(port: number) {
	const app = express();

	app.use(express.json());
	app.use(helmet());
	app.use(cors(corsConfig));

	app.use("/api", authRouter);
	app.use("/api", usersRoute);

	app.listen(port, () => console.log(`Server running on port ${port}`));
}
