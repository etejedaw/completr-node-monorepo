import { type NextFunction, type Request, type Response } from "express";

import { PinoLogger } from "../logger/pino.logger";

export function loggerMiddleware(
	request: Request,
	response: Response,
	next: NextFunction
) {
	const correlationId = request.locals?.correlationId as string;
	const startTime = process.hrtime.bigint();

	const log = new PinoLogger("HTTP");

	response.on("finish", () => {
		const endTime = process.hrtime.bigint();
		const diff = Number(endTime - startTime) / 1_000_000;

		const extra = {
			method: request.method,
			url: request.originalUrl,
			statusCode: response.statusCode,
			responseTime: `${diff.toFixed(2)}ms`,
			correlationId: correlationId
		};

		let result: "error" | "warn" | "info";
		if (response.statusCode >= 500) result = "error";
		else if (response.statusCode >= 400) result = "warn";
		else result = "info";

		log[result]("request", "completed", extra);
	});

	next();
}
