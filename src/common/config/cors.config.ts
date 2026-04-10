import { CorsOptions } from "cors";
import { environmentConfig } from "./environment.config";

const origin = environmentConfig.CORS_ORIGIN;

export const corsConfig: CorsOptions = {
	origin: origin === "*" ? "*" : origin.split(","),
	methods: environmentConfig.CORS_METHODS.split(","),
	allowedHeaders: environmentConfig.CORS_ALLOWED_HEADERS.split(","),
	credentials: environmentConfig.CORS_CREDENTIALS
};
