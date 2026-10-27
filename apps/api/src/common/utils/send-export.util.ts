import { type Response } from "express";

import { type ExportFormat } from "../interfaces/export-format.interface";
import { type ExportRow } from "../interfaces/export-row.interface";
import { serializeCsv } from "./serialize-csv.util";

interface ExportPayload<Column extends string> {
	resource: string;
	format: ExportFormat;
	columns: readonly Column[];
	rows: ExportRow<Column>[];
}

function todayInUtc() {
	return new Date().toISOString().slice(0, 10);
}

export function buildExportFilename(resource: string, format: ExportFormat) {
	return `completr-${resource}-${todayInUtc()}.${format}`;
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
