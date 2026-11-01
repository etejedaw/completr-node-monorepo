import { HttpClient, HttpContext } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../../environments/environment";
import { SUPPRESS_VALIDATION_TOAST } from "../../../shared/utils/validation-errors";
import {
	type CreatePremiumPromotionRequest,
	type PremiumPromotion,
	type UpdatePremiumPromotionRequest
} from "./premium-promotions-admin.model";

const SUPPRESS_TOAST_CONTEXT = new HttpContext().set(
	SUPPRESS_VALIDATION_TOAST,
	true
);

@Injectable({ providedIn: "root" })
export class PremiumPromotionsAdminService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/admin/premium-promotions`;

	list() {
		return this.http
			.get<{ data: { promotions: PremiumPromotion[] } }>(this.baseUrl)
			.pipe(map(res => res.data.promotions));
	}

	create(data: CreatePremiumPromotionRequest) {
		return this.http
			.post<{ data: { promotion: PremiumPromotion } }>(
				this.baseUrl,
				data,
				{ context: SUPPRESS_TOAST_CONTEXT }
			)
			.pipe(map(res => res.data.promotion));
	}

	update(promotionId: string, data: UpdatePremiumPromotionRequest) {
		return this.http
			.patch<{ data: { promotion: PremiumPromotion } }>(
				`${this.baseUrl}/${promotionId}`,
				data,
				{ context: SUPPRESS_TOAST_CONTEXT }
			)
			.pipe(map(res => res.data.promotion));
	}

	revoke(promotionId: string) {
		return this.http
			.post<{ data: { promotion: PremiumPromotion } }>(
				`${this.baseUrl}/${promotionId}/revoke`,
				{},
				{ context: SUPPRESS_TOAST_CONTEXT }
			)
			.pipe(map(res => res.data.promotion));
	}
}
