import { CorsOptions } from "cors";
import { environmentConfig } from "./environment.config";

export const corsConfig: CorsOptions = {
	origin: environmentConfig.CORS_ORIGIN.split(","),
	methods: environmentConfig.CORS_METHODS.split(","),
	allowedHeaders: environmentConfig.CORS_ALLOWED_HEADERS.split(","),
	credentials: environmentConfig.CORS_CREDENTIALS
};
