import { inject, Injectable } from "@angular/core";
import { HttpClient, HttpContext } from "@angular/common/http";
import { environment } from "../../../environments/environment";
import { User, VisibilityLevel } from "../../core/models";
import { map } from "rxjs";
import { SUPPRESS_VALIDATION_TOAST } from "../../shared/utils/validation-errors";
import { buildHttpParams } from "../../core/utils/http-params";

const SUPPRESS_TOAST_CONTEXT = new HttpContext().set(
	SUPPRESS_VALIDATION_TOAST,
	true
);

interface CreateUserRequest {
	username: string;
	email: string;
	password: string;
	name: string;
	bio?: string;
	avatarUrl?: string;
}

interface CreateUserResponse {
	data: { user: User };
}

interface GameReportsResponse {
	data: { reports: GameReport[] };
}

interface UpdateReportResponse {
	data: { report: GameReport };
}

export interface GameReport {
	id: string;
	gameId: string;
	userId: string;
	message: string;
	status: "pending" | "approved" | "rejected";
	createdAt: string;
	updatedAt: string;
	Game: { id: string; title: string; code: string };
	User: { id: string; username: string };
}

@Injectable({ providedIn: "root" })
export class AdminService {
	private readonly http = inject(HttpClient);

	createUser(data: CreateUserRequest) {
		return this.http
			.post<CreateUserResponse>(`${environment.apiUrl}/admin/users`, data, {
				context: SUPPRESS_TOAST_CONTEXT
			})
			.pipe(map(res => res.data.user));
	}

	getPendingReports() {
		return this.http
			.get<GameReportsResponse>(
				`${environment.apiUrl}/admin/game-reports`
			)
			.pipe(map(res => res.data.reports));
	}

	updateReportStatus(reportId: string, status: "approved" | "rejected") {
		return this.http
			.patch<UpdateReportResponse>(
				`${environment.apiUrl}/admin/game-reports/${reportId}`,
				{ status }
			)
			.pipe(map(res => res.data.report));
	}

	listUsers(limit = 50, offset = 0) {
		const params = buildHttpParams({ limit, offset });
		return this.http
			.get<{
				data: { users: AdminUser[]; total: number };
			}>(`${environment.apiUrl}/admin/users`, { params })
			.pipe(map(res => res.data));
	}

	editUser(
		userId: string,
		data: {
			name?: string;
			password?: string;
			role?: string;
			isActive?: boolean;
		}
	) {
		return this.http
			.patch<{
				data: { user: AdminUser };
			}>(`${environment.apiUrl}/admin/users/${userId}`, data, {
				context: SUPPRESS_TOAST_CONTEXT
			})
			.pipe(map(res => res.data.user));
	}

	getAuditLog(
		limit = 50,
		offset = 0,
		filters: { action?: string; targetType?: string } = {}
	) {
		const params = buildHttpParams({ limit, offset, ...filters });
		return this.http
			.get<{
				data: { logs: AuditLogEntry[]; total: number };
			}>(`${environment.apiUrl}/admin/audit`, { params })
			.pipe(map(res => res.data));
	}

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

export interface AdminUser {
	id: string;
	username: string;
	email: string;
	name: string;
	role: string;
	isActive: boolean;
	profileVisibility: VisibilityLevel;
	createdAt: string;
}

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

export interface JobEntry {
	id: string;
	type: string;
	status: string;
	result?: string;
	createdAt: string;
	completedAt?: string;
}
