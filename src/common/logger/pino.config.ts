import pino from "pino";
import path from "node:path";
import fs from "node:fs";
import { environmentConfig } from "../config/environment.config";

const filePath = createLogDirectory();

export const pinoConfig = generatePinoConfig(filePath);

function createLogDirectory() {
	const LOG_DIR_NAME = "logs";
	const LOG_DIR_FILE = "app.log";

	const logDir = path.join(process.cwd(), LOG_DIR_NAME);
	if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

	return path.join(logDir, LOG_DIR_FILE);
}

function generatePinoConfig(logFilePath: string) {
	const nodeEnv = environmentConfig.NODE_ENV;
	if (nodeEnv === "dev") return devLogger();
	return defaultLogger(logFilePath);
}

function devLogger() {
	return pino({
		level: "debug",
		base: undefined,
		transport: {
			target: "pino-pretty",
			options: {
				colorize: true,
				translateTime: "SYS:standard",
				singleLine: true
			}
		}
	});
}

function defaultLogger(logFilePath: string) {
	return pino(
		{
			level: "info",
			base: undefined,
			timestamp: pino.stdTimeFunctions.isoTime
		},
		pino.destination(logFilePath)
	);
}
