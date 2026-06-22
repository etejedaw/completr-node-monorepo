import { inject, Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { map } from "rxjs";
import { environment } from "../../../environments/environment";

export interface SavedFilter {
	id: string;
	name: string;
	description?: string;
	filters: Record<string, unknown>;
	sortBy?: string;
	sortOrder?: string;
	showInBacklog: boolean;
	isDefault: boolean;
}

interface SavedFiltersResponse {
	data: { savedFilters: SavedFilter[]; total?: number };
}

export interface SavedFiltersPagination {
	limit?: number;
	offset?: number;
	search?: string;
}

interface SavedFilterResponse {
	data: { savedFilter: SavedFilter };
}

export interface CreateSavedFilterDto {
	name: string;
	description?: string;
	filters: Record<string, unknown>;
	sortBy?: string;
	sortOrder?: string;
	showInBacklog?: boolean;
	isDefault?: boolean;
}

@Injectable({ providedIn: "root" })
export class SavedFiltersService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/users/me/saved-filters`;

	getAll() {
		return this.http
			.get<SavedFiltersResponse>(this.baseUrl)
			.pipe(map(res => res.data.savedFilters));
	}

	getPaged(pagination: SavedFiltersPagination = {}) {
		let params = new HttpParams();
		if (pagination.limit !== undefined)
			params = params.set("limit", String(pagination.limit));
		if (pagination.offset !== undefined)
			params = params.set("offset", String(pagination.offset));
		if (pagination.search) params = params.set("search", pagination.search);
		return this.http.get<SavedFiltersResponse>(this.baseUrl, { params });
	}

	create(dto: CreateSavedFilterDto) {
		return this.http
			.post<SavedFilterResponse>(this.baseUrl, dto)
			.pipe(map(res => res.data.savedFilter));
	}

	update(id: string, dto: Partial<CreateSavedFilterDto>) {
		return this.http
			.patch<SavedFilterResponse>(`${this.baseUrl}/${id}`, dto)
			.pipe(map(res => res.data.savedFilter));
	}

	delete(id: string) {
		return this.http.delete(`${this.baseUrl}/${id}`);
	}
}
