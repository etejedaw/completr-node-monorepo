import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../../environments/environment";
import {
	AuthService,
	AuthSession
} from "../../../core/services/auth";
import { ToastService } from "../../../core/services/toast";
import { UiButton, UiInput, UiPagination } from "../../../shared/ui";

@Component({
	selector: "app-settings-security",
	imports: [FormsModule, UiButton, UiInput, UiPagination],
	templateUrl: "./settings-security.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsSecurity implements OnInit {
	private readonly authService = inject(AuthService);
	private readonly http = inject(HttpClient);
	private readonly toast = inject(ToastService);

	protected readonly sessions = signal<AuthSession[]>([]);
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = 10;
	protected readonly sessionsLoading = signal(false);
	protected readonly revokingSessionId = signal<string | null>(null);
	protected readonly revokingAll = signal(false);
	protected readonly confirmRevokeAll = signal(false);

	protected readonly currentSessionId = computed(() => this.authService.sessionId());

	protected readonly newPassword = signal("");
	protected readonly confirmPassword = signal("");
	protected readonly changingPassword = signal(false);

	ngOnInit() {
		this.loadSessions();
	}

	loadSessions() {
		this.sessionsLoading.set(true);
		this.authService.getSessions({ limit: this.limit, offset: this.offset() }).subscribe({
			next: data => {
				this.sessions.set(data.sessions);
				this.total.set(data.total);
				this.sessionsLoading.set(false);
			},
			error: () => this.sessionsLoading.set(false)
		});
	}

	onOffsetChange(value: number) {
		this.offset.set(value);
		this.loadSessions();
	}

	revokeSession(session: AuthSession) {
		if (this.revokingSessionId()) return;
		if (session.id === this.currentSessionId()) {
			this.toast.warning("Use the logout button to end the current session.");
			return;
		}
		this.revokingSessionId.set(session.id);
		this.authService.revokeSession(session.id).subscribe({
			next: () => {
				this.revokingSessionId.set(null);
				this.toast.success("Session revoked.");
				this.loadSessions();
			},
			error: () => {
				this.revokingSessionId.set(null);
				this.toast.warning("Could not revoke session.");
			}
		});
	}

	revokeAllOthers() {
		const current = this.currentSessionId();
		if (!current) {
			this.toast.warning("Current session unknown. Please re-login.");
			return;
		}
		this.revokingAll.set(true);
		this.authService.revokeOtherSessions(current).subscribe({
			next: count => {
				this.revokingAll.set(false);
				this.confirmRevokeAll.set(false);
				this.toast.success(
					count === 0
						? "No other sessions to revoke."
						: `${count} session${count === 1 ? "" : "s"} revoked.`
				);
				this.offset.set(0);
				this.loadSessions();
			},
			error: () => {
				this.revokingAll.set(false);
				this.toast.warning("Could not revoke sessions.");
			}
		});
	}

	changePassword() {
		if (this.newPassword().length < 8) {
			this.toast.warning("Password must be at least 8 characters.");
			return;
		}
		if (this.newPassword() !== this.confirmPassword()) {
			this.toast.warning("Passwords do not match.");
			return;
		}
		this.changingPassword.set(true);
		this.http
			.patch(`${environment.apiUrl}/auth/password`, {
				password: this.newPassword()
			})
			.subscribe({
				next: () => {
					this.changingPassword.set(false);
					this.newPassword.set("");
					this.confirmPassword.set("");
					this.toast.success(
						"Password changed. All other sessions were signed out."
					);
					this.loadSessions();
				},
				error: () => {
					this.changingPassword.set(false);
					this.toast.warning("Could not change password.");
				}
			});
	}

	protected timeAgo(date: string | null): string {
		if (!date) return "never";
		const diff = Date.now() - new Date(date).getTime();
		const minutes = Math.floor(diff / 60000);
		if (minutes < 1) return "just now";
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	protected parseDevice(userAgent: string | null): {
		name: string;
		icon: string;
	} {
		if (!userAgent) return { name: "Unknown device", icon: "devices" };
		const ua = userAgent;

		let os = "Unknown OS";
		let icon = "devices";
		if (/iPhone|iPad|iPod/i.test(ua)) {
			os = /iPad/i.test(ua) ? "iPad" : "iPhone";
			icon = "phone_iphone";
		} else if (/Android/i.test(ua)) {
			os = "Android";
			icon = "phone_android";
		} else if (/Windows/i.test(ua)) {
			os = "Windows";
			icon = "desktop_windows";
		} else if (/Macintosh|Mac OS X/i.test(ua)) {
			os = "macOS";
			icon = "laptop_mac";
		} else if (/Linux/i.test(ua)) {
			os = "Linux";
			icon = "computer";
		}

		let browser = "Browser";
		if (/Edg\//i.test(ua)) browser = "Edge";
		else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
		else if (/Firefox\//i.test(ua)) browser = "Firefox";
		else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";

		return { name: `${browser} · ${os}`, icon };
	}
}
