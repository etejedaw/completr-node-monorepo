import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map } from "rxjs";
import { environment } from "../../../../environments/environment";
import { buildHttpParams } from "../../../core/utils/http-params";

export interface AuditLogEntry {
	id: string;
	user: { id: string; username: string; name: string } | null;
	action: string;
	targetType: string;
	targetId: string;
	target?: {
		type: string;
		id: string;
		label: string;
		code?: string;
		username?: string;
	};
	createdAt: string;
}

export interface AuditFilters {
	action?: string;
	targetType?: string;
}

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
