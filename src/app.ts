import { environmentConfig } from "./common/config/environment.config";
import { databaseInit } from "./database/database.init";
import { server } from "./server";

async function bootstrap() {
	await databaseInit();
	server(environmentConfig.PORT);
}

void bootstrap();
