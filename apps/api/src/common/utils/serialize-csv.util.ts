import {
	type ExportRow,
	type ExportValue
} from "../interfaces/export-row.interface";

const UTF8_BOM = "﻿";
const CSV_LINE_BREAK = "\r\n";
const FORMULA_TRIGGER_PATTERN = /^[=+\-@\t\r]/;
const QUOTE_REQUIRED_PATTERN = /[",\r\n]/;

function neutralizeFormula(text: string) {
	return FORMULA_TRIGGER_PATTERN.test(text) ? `'${text}` : text;
}

function quoteIfNeeded(text: string) {
	if (!QUOTE_REQUIRED_PATTERN.test(text)) return text;
	return `"${text.replaceAll('"', '""')}"`;
}

export function formatCsvField(value: ExportValue) {
	if (value === null) return "";
	if (typeof value === "string")
		return quoteIfNeeded(neutralizeFormula(value));
	return String(value);
}

export function serializeCsv<Column extends string>(
	columns: readonly Column[],
	rows: ExportRow<Column>[]
) {
	const header = columns.map(formatCsvField).join(",");
	const records = rows.map(row =>
		columns.map(column => formatCsvField(row[column])).join(",")
	);
	return (
		UTF8_BOM +
		[header, ...records].map(line => line + CSV_LINE_BREAK).join("")
	);
}
