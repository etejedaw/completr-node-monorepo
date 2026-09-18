import { environmentConfig } from "./common/config/environment.config";
import { initDatabase } from "./database/init.database";
import { server } from "./server";

async function bootstrap() {
	await initDatabase();
	server(environmentConfig.PORT);
}

void bootstrap();
