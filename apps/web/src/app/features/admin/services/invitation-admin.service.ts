import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../../environments/environment";

export interface AdminInvitation {
	id: string;
	email: string;
	createdAt: string;
	expiresAt: string;
	isExpired: boolean;
}

@Injectable({ providedIn: "root" })
export class InvitationAdminService {
	private readonly http = inject(HttpClient);

	invite(email: string) {
		return this.http
			.post<{
				data: { invitation: AdminInvitation };
			}>(`${environment.apiUrl}/admin/invitations`, { email })
			.pipe(map(res => res.data.invitation));
	}

	list() {
		return this.http
			.get<{
				data: { invitations: AdminInvitation[] };
			}>(`${environment.apiUrl}/admin/invitations`)
			.pipe(map(res => res.data.invitations));
	}

	revoke(invitationId: string) {
		return this.http.delete<void>(
			`${environment.apiUrl}/admin/invitations/${invitationId}`
		);
	}
}
