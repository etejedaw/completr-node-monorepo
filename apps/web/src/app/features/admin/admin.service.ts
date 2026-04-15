import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../environments/environment";
import { User } from "../../core/models";
import { map } from "rxjs";

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
			.post<CreateUserResponse>(`${environment.apiUrl}/admin/users`, data)
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
}
