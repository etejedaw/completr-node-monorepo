import { asRecord } from "../../scraping/utils/as-record.util";

export function readBindingValue(
	binding: Record<string, unknown>,
	name: string
): string | undefined {
	const value = asRecord(binding[name])?.value;
	return typeof value === "string" ? value : undefined;
}
