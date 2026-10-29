import { HttpClient } from "@angular/common/http";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { form, FormField, maxLength, validate } from "@angular/forms/signals";

import { environment } from "../../../../environments/environment";
import { AuthService } from "../../../core/services/auth";
import { type AuthSession } from "../../../core/services/auth.model";
import { ToastService } from "../../../core/services/toast";
import {
	failedPasswordRules,
	PASSWORD_MAX_LENGTH
} from "../../../core/utils/password-policy";
import { PasswordRules } from "../../../shared/components/password-rules/password-rules";
import { UiButton, UiInput, UiPagination } from "../../../shared/ui";
import { SettingsPanel } from "../components/settings-panel";
import { SettingsRow } from "../components/settings-row";
import { currentSessionFirst, describeDevice, timeAgo } from "./session-device";

const SESSIONS_PAGE_SIZE = 10;
const EMPTY_PASSWORDS = { newPassword: "", confirmPassword: "" };

@Component({
	selector: "app-settings-security",
	imports: [
		FormField,
		PasswordRules,
		SettingsPanel,
		SettingsRow,
		UiButton,
		UiInput,
		UiPagination
	],
	templateUrl: "./settings-security.html",
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsSecurity implements OnInit {
	private readonly authService = inject(AuthService);
	private readonly http = inject(HttpClient);
	private readonly toast = inject(ToastService);

	protected readonly describeDevice = describeDevice;
	protected readonly timeAgo = timeAgo;

	protected readonly passwords = signal(EMPTY_PASSWORDS);
	protected readonly passwordForm = form(this.passwords, path => {
		maxLength(path.newPassword, PASSWORD_MAX_LENGTH);
		maxLength(path.confirmPassword, PASSWORD_MAX_LENGTH);
		validate(path.newPassword, ({ value }) =>
			failedPasswordRules(value()).length > 0
				? {
						kind: "passwordPolicy",
						message: "Meet every requirement below."
					}
				: null
		);
		validate(path.confirmPassword, ({ value, valueOf }) =>
			value() !== valueOf(path.newPassword)
				? {
						kind: "passwordMismatch",
						message: "Both passwords must match."
					}
				: null
		);
	});
	protected readonly showPasswords = signal(false);
	protected readonly changingPassword = signal(false);

	protected readonly currentSessionId = signal(this.authService.sessionId());
	private readonly sessionsPage = signal<AuthSession[]>([]);
	protected readonly sessions = computed(() =>
		currentSessionFirst(this.sessionsPage(), this.currentSessionId())
	);
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = SESSIONS_PAGE_SIZE;
	protected readonly sessionsLoading = signal(true);
	protected readonly revokingSessionId = signal<string | null>(null);
	protected readonly confirmingSignOutOthers = signal(false);
	protected readonly signingOutOthers = signal(false);
	protected readonly otherSessionsCount = computed(() =>
		Math.max(this.total() - 1, 0)
	);

	ngOnInit() {
		this.loadSessions();
	}

	protected changePassword() {
		if (this.passwordForm().invalid()) {
			this.passwordForm().markAsTouched();
			return;
		}
		this.changingPassword.set(true);
		this.http
			.patch(`${environment.apiUrl}/auth/password`, {
				password: this.passwords().newPassword
			})
			.subscribe({
				next: () => {
					this.changingPassword.set(false);
					this.passwords.set(EMPTY_PASSWORDS);
					this.passwordForm().reset();
					this.showPasswords.set(false);
					this.toast.success(
						"Password updated. Your other devices were signed out."
					);
					this.offset.set(0);
					this.loadSessions();
				},
				error: () => {
					this.changingPassword.set(false);
					this.toast.warning("Could not update your password.");
				}
			});
	}

	protected goToSessionsPage(offset: number) {
		this.offset.set(offset);
		this.loadSessions();
	}

	protected revokeSession(session: AuthSession) {
		if (this.revokingSessionId()) return;
		this.revokingSessionId.set(session.id);
		this.authService.revokeSession(session.id).subscribe({
			next: () => {
				this.revokingSessionId.set(null);
				this.toast.success(
					`Signed out ${describeDevice(session.deviceInfo).name}.`
				);
				this.loadSessions();
			},
			error: () => {
				this.revokingSessionId.set(null);
				this.toast.warning("Could not sign out that device.");
			}
		});
	}

	protected signOutOtherSessions() {
		const current = this.currentSessionId();
		if (!current) {
			this.toast.warning("Sign in again to manage your devices.");
			return;
		}
		this.signingOutOthers.set(true);
		this.authService.revokeOtherSessions(current).subscribe({
			next: count => {
				this.signingOutOthers.set(false);
				this.confirmingSignOutOthers.set(false);
				this.toast.success(
					count === 0
						? "No other devices were signed in."
						: `Signed out ${count} other device${count === 1 ? "" : "s"}.`
				);
				this.offset.set(0);
				this.loadSessions();
			},
			error: () => {
				this.signingOutOthers.set(false);
				this.toast.warning("Could not sign out your other devices.");
			}
		});
	}

	private loadSessions() {
		this.sessionsLoading.set(true);
		this.authService
			.getSessions({ limit: this.limit, offset: this.offset() })
			.subscribe({
				next: data => {
					this.sessionsPage.set(data.sessions);
					this.total.set(data.total);
					this.sessionsLoading.set(false);
				},
				error: () => this.sessionsLoading.set(false)
			});
	}
}
