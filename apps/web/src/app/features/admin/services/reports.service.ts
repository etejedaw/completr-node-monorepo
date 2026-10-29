import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../../environments/environment";
import { type GameReport } from "./reports.model";

@Injectable({ providedIn: "root" })
export class ReportsService {
	private readonly http = inject(HttpClient);

	getPendingReports() {
		return this.http
			.get<{
				data: { reports: GameReport[] };
			}>(`${environment.apiUrl}/admin/game-reports`)
			.pipe(map(res => res.data.reports));
	}

	updateReportStatus(reportId: string, status: "approved" | "rejected") {
		return this.http
			.patch<{
				data: { report: GameReport };
			}>(`${environment.apiUrl}/admin/game-reports/${reportId}`, {
				status
			})
			.pipe(map(res => res.data.report));
	}
}
