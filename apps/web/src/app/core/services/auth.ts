import { computed, inject, Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { map, Observable, tap } from "rxjs";
import { environment } from "../../../environments/environment";
import { StorageService } from "./storage";
import { ThemeService, ThemeId } from "./theme";
import { User } from "../models";
import { buildHttpParams } from "../utils/http-params";

const TOKEN_KEY = "access_token";
const SESSION_ID_KEY = "session_id";

interface LoginRequest {
	email: string;
	password: string;
}

interface RegisterRequest {
	username: string;
	email: string;
	password: string;
	name: string;
}

interface AuthResponse {
	data: {
		access_token: string;
		session_id: string;
	};
}

interface UserResponse {
	data: { user: User };
}

export interface AuthSession {
	id: string;
	deviceInfo: string | null;
	lastUsedAt: string | null;
	createdAt: string;
	expiresAt: string;
}

@Injectable({ providedIn: "root" })
export class AuthService {
	private readonly http = inject(HttpClient);
	private readonly storage = inject(StorageService);
	private readonly router = inject(Router);
	private readonly themeService = inject(ThemeService);

	private readonly _user = signal<User | null>(null);
	readonly user = this._user.asReadonly();
	readonly isLoggedIn = computed(
		() => this._user() !== null || this.storage.get(TOKEN_KEY) !== null
	);

	token(): string | null {
		return this.storage.get(TOKEN_KEY);
	}

	sessionId(): string | null {
		return this.storage.get(SESSION_ID_KEY);
	}

	isAccessTokenExpired(skewSeconds = 30): boolean {
		const token = this.token();
		if (!token) return false;
		const exp = this.decodeExp(token);
		if (exp === null) return false;
		return exp - Date.now() / 1000 <= skewSeconds;
	}

	private decodeExp(token: string): number | null {
		const payload = token.split(".")[1];
		if (!payload) return null;
		try {
			const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
			const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
			const claims = JSON.parse(atob(padded));
			return typeof claims.exp === "number" ? claims.exp : null;
		} catch {
			return null;
		}
	}

	login(credentials: LoginRequest) {
		return this.postAuth("/auth/login", credentials);
	}

	register(data: RegisterRequest) {
		return this.postAuth("/auth/register", data);
	}

	refresh(): Observable<AuthResponse> {
		return this.postAuth("/auth/refresh", {});
	}

	private postAuth(path: string, body: unknown): Observable<AuthResponse> {
		return this.http
			.post<AuthResponse>(`${environment.apiUrl}${path}`, body, {
				withCredentials: true
			})
			.pipe(tap(res => this.saveTokens(res)));
	}

	loadUser() {
		return this.http
			.get<UserResponse>(`${environment.apiUrl}/users/me`)
			.pipe(
				tap(res => {
					this._user.set(res.data.user);
					if (res.data.user.theme) {
						this.themeService.setLocal(
							res.data.user.theme as ThemeId
						);
					}
				})
			);
	}

	logout() {
		this.http
			.post(
				`${environment.apiUrl}/auth/logout`,
				{},
				{ withCredentials: true }
			)
			.subscribe();
		this.clearSession();
	}

	clearSession() {
		this.storage.remove(TOKEN_KEY);
		this.storage.remove(SESSION_ID_KEY);
		this._user.set(null);
		this.router.navigate(["/login"]);
	}

	getSessions(params?: { limit?: number; offset?: number }) {
		const query = buildHttpParams(params);
		return this.http
			.get<{
				data: { sessions: AuthSession[]; total: number };
			}>(`${environment.apiUrl}/auth/sessions`, { params: query })
			.pipe(map(res => res.data));
	}

	revokeSession(sessionId: string) {
		return this.http.delete(
			`${environment.apiUrl}/auth/sessions/${sessionId}`,
			{ responseType: "text" }
		);
	}

	revokeOtherSessions(currentSessionId: string) {
		return this.http
			.delete<{
				data: { revoked: number };
			}>(`${environment.apiUrl}/auth/sessions/others/${currentSessionId}`)
			.pipe(map(res => res.data.revoked));
	}

	private saveTokens(res: AuthResponse) {
		this.storage.set(TOKEN_KEY, res.data.access_token);
		this.storage.set(SESSION_ID_KEY, res.data.session_id);
	}
}
