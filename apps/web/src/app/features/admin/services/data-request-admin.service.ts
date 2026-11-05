import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map, type Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import { type DataRequest } from "../../../core/models";
import { dataExportFallbackName } from "../../../core/services/data-requests";
import { ExportService } from "../../../core/services/export";
import { buildHttpParams } from "../../../core/utils/http-params";
import {
	type AdminDataRequestPage,
	type AdminDataRequestQuery
} from "./data-request-admin.model";

const ADMIN_URL = `${environment.apiUrl}/admin`;

@Injectable({ providedIn: "root" })
export class DataRequestAdminService {
	private readonly http = inject(HttpClient);
	private readonly exportService = inject(ExportService);

	list(query: AdminDataRequestQuery): Observable<AdminDataRequestPage> {
		return this.http
			.get<{
				data: AdminDataRequestPage;
			}>(`${ADMIN_URL}/data-requests`, {
				params: buildHttpParams({ ...query })
			})
			.pipe(map(res => res.data));
	}

	complete(requestId: string): Observable<DataRequest> {
		return this.http
			.post<{
				data: { request: DataRequest };
			}>(`${ADMIN_URL}/data-requests/${encodeURIComponent(requestId)}/complete`, {})
			.pipe(map(res => res.data.request));
	}

	reject(requestId: string, reason: string): Observable<DataRequest> {
		return this.http
			.post<{
				data: { request: DataRequest };
			}>(`${ADMIN_URL}/data-requests/${encodeURIComponent(requestId)}/reject`, {
				reason
			})
			.pipe(map(res => res.data.request));
	}

	downloadUserData(userId: string, username: string): Observable<void> {
		return this.exportService.downloadAttachment(
			`${ADMIN_URL}/users/${encodeURIComponent(userId)}/data-export`,
			dataExportFallbackName(username)
		);
	}

	deleteUser(userId: string): Observable<void> {
		return this.http.delete<void>(
			`${ADMIN_URL}/users/${encodeURIComponent(userId)}`
		);
	}
}
