import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map } from "rxjs";
import { environment } from "../../../environments/environment";
import { Game } from "../../core/models";
import { buildHttpParams } from "../../core/utils/http-params";

export interface Franchise {
	id: string;
	name: string;
	code: string;
	description?: string | null;
}

export interface FranchiseProgress {
	franchise: { id: string; name: string; code: string };
	completed: number;
	total: number;
}

export interface FranchiseDetail {
	franchise: Franchise;
	games: (Game & { backlogStatus: string | null })[];
	progress: { completed: number; total: number };
	hasMore: boolean;
}

export interface FranchiseDto {
	name: string;
	description?: string | null;
}

@Injectable({ providedIn: "root" })
export class FranchisesService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/franchises`;

	getFranchises(
		query: { search?: string; limit?: number; offset?: number } = {}
	) {
		const params = buildHttpParams(query);
		return this.http
			.get<{
				data: { franchises: Franchise[]; total: number };
			}>(this.baseUrl, { params })
			.pipe(map(res => res.data));
	}

	getFranchiseByCode(
		code: string,
		pagination: { limit?: number; offset?: number } = {}
	) {
		const params = buildHttpParams(pagination);
		return this.http
			.get<{
				data: FranchiseDetail;
			}>(`${this.baseUrl}/${code}`, { params })
			.pipe(map(res => res.data));
	}

	createFranchise(dto: FranchiseDto) {
		return this.http
			.post<{ data: { franchise: Franchise } }>(this.baseUrl, dto)
			.pipe(map(res => res.data.franchise));
	}

	updateFranchise(id: string, dto: FranchiseDto) {
		return this.http
			.patch<{ data: { franchise: Franchise } }>(
				`${this.baseUrl}/${id}`,
				dto
			)
			.pipe(map(res => res.data.franchise));
	}

	deleteFranchise(id: string) {
		return this.http.delete<void>(`${this.baseUrl}/${id}`);
	}
}
