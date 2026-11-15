import { type Response } from "express";

import { type ExportPayload } from "../interfaces/export-payload.interface";
import { type ExportFormat } from "../types/export-format.types";
import { serializeCsv } from "./serialize-csv.util";
import { toUtcDay } from "./to-utc-day.util";

export function buildExportFilename(resource: string, format: ExportFormat) {
	return `completr-${resource}-${toUtcDay(new Date())}.${format}`;
}

export function sendExport<Column extends string>(
	response: Response,
	{ resource, format, columns, rows }: ExportPayload<Column>
) {
	response.setHeader(
		"Content-Disposition",
		`attachment; filename="${buildExportFilename(resource, format)}"`
	);

	if (format === "json") return response.status(200).json(rows);

	return response
		.status(200)
		.type("text/csv; charset=utf-8")
		.send(serializeCsv(columns, rows));
}
