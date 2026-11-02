export type ExportValue = string | number | boolean | null;

export type ExportRow<Column extends string> = Record<Column, ExportValue>;
