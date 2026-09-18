import { inject, Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map, tap } from "rxjs";
import { environment } from "../../../environments/environment";

export interface IncomingFollowRequest {
	requesterId: string;
	createdAt: string;
	user: {
		id: string;
		username: string;
		name: string;
		avatarUrl?: string;
	};
}

@Injectable({ providedIn: "root" })
export class FollowRequestsService {
	private readonly http = inject(HttpClient);

	private readonly _incoming = signal<IncomingFollowRequest[] | null>(null);
	readonly incoming = this._incoming.asReadonly();

	private readonly _pendingCount = signal(0);
	readonly pendingCount = this._pendingCount.asReadonly();

	list() {
		return this.http
			.get<{
				data: { requests: IncomingFollowRequest[] };
			}>(`${environment.apiUrl}/users/me/follow-requests`)
			.pipe(
				map(res => res.data.requests),
				tap(rows => {
					this._incoming.set(rows);
					this._pendingCount.set(rows.length);
				})
			);
	}

	accept(requesterId: string) {
		return this.http
			.post(
				`${environment.apiUrl}/users/me/follow-requests/${requesterId}/accept`,
				{}
			)
			.pipe(tap(() => this.removeLocally(requesterId)));
	}

	reject(requesterId: string) {
		return this.http
			.post(
				`${environment.apiUrl}/users/me/follow-requests/${requesterId}/reject`,
				{}
			)
			.pipe(tap(() => this.removeLocally(requesterId)));
	}

	private removeLocally(requesterId: string) {
		const current = this._incoming();
		if (!current) return;
		const next = current.filter(r => r.requesterId !== requesterId);
		this._incoming.set(next);
		this._pendingCount.set(next.length);
	}
}
