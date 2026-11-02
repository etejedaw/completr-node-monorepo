import { type ExportFormat } from "../types/export-format.types";
import { type ExportRow } from "../types/export-row.types";

export interface ExportPayload<Column extends string> {
	resource: string;
	format: ExportFormat;
	columns: readonly Column[];
	rows: ExportRow<Column>[];
}
