import { HttpClient, HttpContext } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../../environments/environment";
import { buildHttpParams } from "../../../core/utils/http-params";
import {
	SUPPRESS_CONFLICT_TOAST,
	SUPPRESS_VALIDATION_TOAST
} from "../../../shared/utils/validation-errors";
import {
	type AdminRewind,
	type AdminRewindsPage,
	type AdminRewindsQuery,
	type CreateRewindEditionRequest,
	type RewindEdition,
	type RewindEditionsCatalog,
	type UpdateRewindEditionRequest,
	type UpdateRewindEditionResult
} from "./rewind-admin.model";

const SUPPRESS_FORM_TOASTS_CONTEXT = new HttpContext()
	.set(SUPPRESS_VALIDATION_TOAST, true)
	.set(SUPPRESS_CONFLICT_TOAST, true);

@Injectable({ providedIn: "root" })
export class RewindAdminService {
	private readonly http = inject(HttpClient);

	listEditions() {
		return this.http
			.get<{ data: RewindEditionsCatalog }>(editionsUrl())
			.pipe(map(res => res.data));
	}

	createEdition(request: CreateRewindEditionRequest) {
		return this.http
			.post<{ data: { edition: RewindEdition } }>(
				editionsUrl(),
				request,
				{
					context: SUPPRESS_FORM_TOASTS_CONTEXT
				}
			)
			.pipe(map(res => res.data.edition));
	}

	updateEdition(year: number, request: UpdateRewindEditionRequest) {
		return this.http
			.put<{ data: UpdateRewindEditionResult }>(
				`${editionsUrl()}/${year}`,
				request,
				{ context: SUPPRESS_FORM_TOASTS_CONTEXT }
			)
			.pipe(map(res => res.data));
	}

	listRewinds(query: AdminRewindsQuery) {
		const params = buildHttpParams({ ...query });
		return this.http
			.get<{ data: AdminRewindsPage }>(rewindsUrl(), { params })
			.pipe(map(res => res.data));
	}

	updateRegenerationsLeft(rewindId: string, regenerationsLeft: number) {
		return this.http
			.patch<{ data: { rewind: AdminRewind } }>(
				`${rewindsUrl()}/${rewindId}`,
				{ regenerationsLeft },
				{ context: SUPPRESS_FORM_TOASTS_CONTEXT }
			)
			.pipe(map(res => res.data.rewind));
	}
}

function editionsUrl() {
	return `${environment.apiUrl}/admin/rewind/editions`;
}

function rewindsUrl() {
	return `${environment.apiUrl}/admin/rewinds`;
}
