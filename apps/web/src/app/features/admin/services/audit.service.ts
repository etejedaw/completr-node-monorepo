import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../../environments/environment";
import { buildHttpParams } from "../../../core/utils/http-params";
import { type AuditFilters, type AuditLogEntry } from "./audit.model";

@Injectable({ providedIn: "root" })
export class AuditService {
	private readonly http = inject(HttpClient);

	getAuditLog(limit = 50, offset = 0, filters: AuditFilters = {}) {
		const params = buildHttpParams({ limit, offset, ...filters });
		return this.http
			.get<{
				data: { logs: AuditLogEntry[]; total: number };
			}>(`${environment.apiUrl}/admin/audit`, { params })
			.pipe(map(res => res.data));
	}
}
