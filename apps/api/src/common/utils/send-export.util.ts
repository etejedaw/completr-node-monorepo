import { type Response } from "express";

import { type ExportRow } from "../interfaces/export-row.interface";
import { type ExportFormatQuery } from "../schemas/export-format-query.schema";
import { serializeCsv } from "./serialize-csv.util";

interface ExportPayload<Column extends string> {
	resource: string;
	format: ExportFormatQuery["format"];
	columns: readonly Column[];
	rows: ExportRow<Column>[];
}

function todayInUtc() {
	return new Date().toISOString().slice(0, 10);
}

export function buildExportFilename(
	resource: string,
	format: ExportFormatQuery["format"]
) {
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
