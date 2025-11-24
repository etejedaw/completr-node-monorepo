import express from "express";
import helmet from "helmet";
import usersRoute from "./users/users.routes";

export function server(port: number) {
	const app = express();

	app.use(express.json());
	app.use(helmet());

	app.use(usersRoute);

	app.listen(port, () => console.log(`Server running on port ${port}`));
}
