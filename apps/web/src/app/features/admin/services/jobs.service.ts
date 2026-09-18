import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../../environments/environment";

export interface JobEntry {
	id: string;
	type: string;
	status: string;
	result?: string;
	createdAt: string;
	completedAt?: string;
}

@Injectable({ providedIn: "root" })
export class JobsService {
	private readonly http = inject(HttpClient);

	getJobs() {
		return this.http
			.get<{
				data: { jobs: JobEntry[] };
			}>(`${environment.apiUrl}/admin/jobs`)
			.pipe(map(res => res.data.jobs));
	}

	startPopulateRawg(limit?: number) {
		const url = limit
			? `${environment.apiUrl}/admin/jobs/populate-rawg?limit=${limit}`
			: `${environment.apiUrl}/admin/jobs/populate-rawg`;
		return this.http
			.post<{ data: { job: JobEntry } }>(url, {})
			.pipe(map(res => res.data.job));
	}

	startCalculateRatings() {
		return this.http
			.post<{
				data: { job: JobEntry };
			}>(`${environment.apiUrl}/admin/jobs/calculate-ratings`, {})
			.pipe(map(res => res.data.job));
	}

	startCalculateDurations() {
		return this.http
			.post<{
				data: { job: JobEntry };
			}>(`${environment.apiUrl}/admin/jobs/calculate-durations`, {})
			.pipe(map(res => res.data.job));
	}

	cancelJob(jobId: string) {
		return this.http.delete(`${environment.apiUrl}/admin/jobs/${jobId}`);
	}
}
