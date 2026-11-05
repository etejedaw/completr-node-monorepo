import fs from "node:fs";
import path from "node:path";

import pino from "pino";
import pretty from "pino-pretty";

import { environmentConfig } from "../config/environment.config";

const LOG_DIR_NAME = "logs";
const LOG_FILE_BASENAME = "app";
const LOG_FILE_EXTENSION = ".log";
const STDOUT_FILE_DESCRIPTOR = 1;
const LOG_ROTATION = {
	frequency: "daily",
	size: "10m",
	limit: { count: 7 }
} as const;

const logDir = createLogDirectory();

export const pinoConfig = generatePinoConfig(logDir);

function createLogDirectory() {
	const dir = path.join(process.cwd(), LOG_DIR_NAME);
	if (!fs.existsSync(dir)) fs.mkdirSync(dir);
	return dir;
}

function generatePinoConfig(dir: string) {
	const nodeEnv = environmentConfig.NODE_ENV;
	if (nodeEnv === "dev") return devLogger();
	if (nodeEnv === "test") return testLogger(dir);
	return productionLogger(dir);
}

function devLogger() {
	return pino(
		{ level: "debug", base: undefined },
		pretty({
			colorize: true,
			translateTime: "SYS:standard",
			singleLine: true
		})
	);
}

function testLogger(dir: string) {
	return pino(
		jsonLoggerOptions(),
		pino.destination(
			path.join(dir, `${LOG_FILE_BASENAME}${LOG_FILE_EXTENSION}`)
		)
	);
}

function productionLogger(dir: string) {
	return pino(
		jsonLoggerOptions(),
		pino.transport({
			targets: [
				{
					target: "pino-roll",
					options: {
						file: path.join(dir, LOG_FILE_BASENAME),
						extension: LOG_FILE_EXTENSION,
						mkdir: true,
						symlink: true,
						...LOG_ROTATION
					}
				},
				{
					target: "pino/file",
					options: { destination: STDOUT_FILE_DESCRIPTOR }
				}
			]
		})
	);
}

function jsonLoggerOptions(): pino.LoggerOptions {
	return {
		level: "info",
		base: undefined,
		timestamp: pino.stdTimeFunctions.isoTime
	};
}
