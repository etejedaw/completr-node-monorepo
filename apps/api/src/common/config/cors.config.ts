import { type CorsOptions } from "cors";

import { environmentConfig } from "./environment.config";

function validateOrigin(
	requestOrigin: string | undefined,
	callback: (err: Error | null, origin?: boolean) => void
) {
	if (environmentConfig.CORS_ORIGIN === "*") return callback(null, true);
	const allowedOrigins = environmentConfig.CORS_ORIGIN.split(",");
	if (!requestOrigin || allowedOrigins.includes(requestOrigin))
		return callback(null, true);
	return callback(null, false);
}

export const corsConfig: CorsOptions = {
	origin: validateOrigin,
	methods: environmentConfig.CORS_METHODS.split(","),
	allowedHeaders: environmentConfig.CORS_ALLOWED_HEADERS.split(","),
	credentials: environmentConfig.CORS_CREDENTIALS
};
