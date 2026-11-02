import { HttpClient, HttpContext } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../../environments/environment";
import { SUPPRESS_VALIDATION_TOAST } from "../../../shared/utils/validation-errors";
import {
	type CreatePremiumGrantRequest,
	type PremiumFeatureDefinition,
	type PremiumGrant
} from "./premium-access-admin.model";

const SUPPRESS_TOAST_CONTEXT = new HttpContext().set(
	SUPPRESS_VALIDATION_TOAST,
	true
);

@Injectable({ providedIn: "root" })
export class PremiumAccessAdminService {
	private readonly http = inject(HttpClient);

	listFeatures() {
		return this.http
			.get<{ data: { features: PremiumFeatureDefinition[] } }>(
				`${environment.apiUrl}/admin/premium-features`
			)
			.pipe(map(res => res.data.features));
	}

	listGrants(userId: string) {
		return this.http
			.get<{ data: { grants: PremiumGrant[] } }>(
				`${environment.apiUrl}/admin/users/${userId}/premium-grants`
			)
			.pipe(map(res => res.data.grants));
	}

	createGrant(userId: string, data: CreatePremiumGrantRequest) {
		return this.http
			.post<{ data: { grant: PremiumGrant } }>(
				`${environment.apiUrl}/admin/users/${userId}/premium-grants`,
				data,
				{ context: SUPPRESS_TOAST_CONTEXT }
			)
			.pipe(map(res => res.data.grant));
	}

	updateGrant(userId: string, grantId: string, expiresAt: string | null) {
		return this.http
			.patch<{ data: { grant: PremiumGrant } }>(
				`${environment.apiUrl}/admin/users/${userId}/premium-grants/${grantId}`,
				{ expiresAt },
				{ context: SUPPRESS_TOAST_CONTEXT }
			)
			.pipe(map(res => res.data.grant));
	}

	revokeGrant(userId: string, grantId: string) {
		return this.http
			.post<{ data: { grant: PremiumGrant } }>(
				`${environment.apiUrl}/admin/users/${userId}/premium-grants/${grantId}/revoke`,
				{},
				{ context: SUPPRESS_TOAST_CONTEXT }
			)
			.pipe(map(res => res.data.grant));
	}
}
