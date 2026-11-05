import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map, type Observable } from "rxjs";

import { environment } from "../../../environments/environment";
import { type DataRequest, type DataRequestType } from "../models";
import { ExportService, localIsoDate } from "./export";

const DATA_REQUESTS_URL = `${environment.apiUrl}/users/me/data-requests`;

export function dataExportFallbackName(username?: string): string {
	const owner = username ? `-${username}` : "";
	return `completr-data${owner}-${localIsoDate(new Date())}.json`;
}

@Injectable({ providedIn: "root" })
export class DataRequestsService {
	private readonly http = inject(HttpClient);
	private readonly exportService = inject(ExportService);

	list(): Observable<DataRequest[]> {
		return this.http
			.get<{
				data: { requests: DataRequest[] };
			}>(DATA_REQUESTS_URL)
			.pipe(map(res => res.data.requests));
	}

	create(type: DataRequestType): Observable<DataRequest> {
		return this.http
			.post<{
				data: { request: DataRequest };
			}>(DATA_REQUESTS_URL, { type })
			.pipe(map(res => res.data.request));
	}

	download(requestId: string): Observable<void> {
		return this.exportService.downloadAttachment(
			`${DATA_REQUESTS_URL}/${encodeURIComponent(requestId)}/download`,
			dataExportFallbackName()
		);
	}
}
