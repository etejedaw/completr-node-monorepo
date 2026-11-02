import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../environments/environment";
import { buildHttpParams } from "../../core/utils/http-params";
import {
	type Franchise,
	type FranchiseDetail,
	type FranchiseDto,
	type FranchisePage
} from "./franchises.model";

@Injectable({ providedIn: "root" })
export class FranchisesService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/franchises`;

	getFranchises(
		query: { search?: string; limit?: number; offset?: number } = {}
	) {
		const params = buildHttpParams(query);
		return this.http
			.get<{ data: FranchisePage }>(this.baseUrl, { params })
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

	setTracked(code: string, tracked: boolean) {
		return tracked
			? this.trackFranchise(code)
			: this.untrackFranchise(code);
	}

	trackFranchise(code: string) {
		return this.http.post<void>(`${this.baseUrl}/${code}/track`, {});
	}

	untrackFranchise(code: string) {
		return this.http.delete<void>(`${this.baseUrl}/${code}/track`);
	}
}
