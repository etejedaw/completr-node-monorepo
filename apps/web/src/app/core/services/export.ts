import { HttpClient, type HttpResponse } from "@angular/common/http";
import { DOCUMENT, inject, Injectable } from "@angular/core";
import { map, type Observable } from "rxjs";

import { environment } from "../../../environments/environment";
import { type Appendable, buildHttpParams } from "../utils/http-params";
import { type ExportResource } from "./export.model";

export type ExportFormat = "csv" | "json";

export type ExportParams = Record<string, Appendable>;

const ACCEPT_BY_FORMAT: Record<ExportFormat, string> = {
	csv: "text/csv",
	json: "application/json"
};

// Matches filename*=UTF-8''completr-backlog-2026-10-27.csv
const ENCODED_FILENAME_PATTERN = /filename\*\s*=\s*(?:[\w-]+'[^']*')?([^;]+)/i;
// Matches filename="completr backlog.csv" and filename=completr-backlog.csv
const PLAIN_FILENAME_PATTERN = /filename\s*=\s*(?:"([^"]+)"|([^;]+))/i;

@Injectable({ providedIn: "root" })
export class ExportService {
	private readonly http = inject(HttpClient);
	private readonly document = inject(DOCUMENT);

	download(
		resource: ExportResource,
		format: ExportFormat,
		params: ExportParams = {}
	): Observable<void> {
		return this.http
			.get(exportUrl(resource), {
				observe: "response",
				responseType: "blob",
				headers: { Accept: ACCEPT_BY_FORMAT[format] },
				params: buildHttpParams(params)
			})
			.pipe(
				map(response =>
					this.saveFile(
						response.body ?? new Blob([]),
						fileNameFrom(response, resource, format)
					)
				)
			);
	}

	saveFile(file: Blob, fileName: string) {
		const objectUrl = URL.createObjectURL(file);
		const link = this.document.createElement("a");
		link.href = objectUrl;
		link.download = fileName;
		link.hidden = true;
		this.document.body.appendChild(link);
		try {
			link.click();
		} finally {
			link.remove();
			URL.revokeObjectURL(objectUrl);
		}
	}
}

function exportUrl(resource: ExportResource): string {
	return typeof resource === "string"
		? `${environment.apiUrl}/users/me/${resource}/export`
		: `${environment.apiUrl}/lists/${encodeURIComponent(resource.listId)}/export`;
}

function fileNameFrom(
	response: HttpResponse<Blob>,
	resource: ExportResource,
	format: ExportFormat
): string {
	return (
		fileNameFromDisposition(response.headers.get("Content-Disposition")) ??
		fallbackFileName(resource, format)
	);
}

export function fileNameFromDisposition(
	disposition: string | null
): string | null {
	if (!disposition) return null;
	const encoded = ENCODED_FILENAME_PATTERN.exec(disposition)?.[1]?.trim();
	if (encoded) {
		try {
			return decodeURIComponent(encoded.replace(/^"|"$/g, ""));
		} catch {
			return null;
		}
	}
	const plain = PLAIN_FILENAME_PATTERN.exec(disposition);
	const name = (plain?.[1] ?? plain?.[2])?.trim();
	return name || null;
}

function fallbackFileName(
	resource: ExportResource,
	format: ExportFormat
): string {
	const name = typeof resource === "string" ? resource : "list";
	return `completr-${name}-${localIsoDate(new Date())}.${format}`;
}

function localIsoDate(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}
