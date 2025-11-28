import { NextFunction, Request, Response } from "express";
import { CustomRequest } from "../interfaces/custom-request.interface";
import { PinoLogger } from "../logger/pino.logger";

export function loggerMiddleware(
	request: Request,
	response: Response,
	next: NextFunction
) {
	const customRequest = request as CustomRequest;

	const { correlationId } = customRequest;
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
