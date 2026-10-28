import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { email, form, FormField, required } from "@angular/forms/signals";

import { ToastService } from "../../../core/services/toast";
import {
	UiAlert,
	UiButton,
	UiDialog,
	UiFieldLabel,
	UiFormField,
	UiInput,
	UiLabel
} from "../../../shared/ui";
import {
	type AdminInvitation,
	InvitationAdminService
} from "../services/invitation-admin.service";

@Component({
	selector: "app-admin-invitations",
	imports: [
		DatePipe,
		FormField,
		UiAlert,
		UiButton,
		UiDialog,
		UiFieldLabel,
		UiFormField,
		UiInput,
		UiLabel
	],
	templateUrl: "./admin-invitations.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminInvitations implements OnInit {
	private readonly invitationAdminService = inject(InvitationAdminService);
	private readonly toast = inject(ToastService);

	protected readonly invitations = signal<AdminInvitation[]>([]);
	protected readonly showInviteModal = signal(false);
	protected readonly isInviting = signal(false);
	protected readonly inviteError = signal("");
	protected readonly busyInvitationId = signal<string | null>(null);
	protected readonly confirmingRevokeId = signal<string | null>(null);

	protected readonly inviteModel = signal({ email: "" });
	protected readonly inviteForm = form(this.inviteModel, path => {
		required(path.email, { message: "Email is required." });
		email(path.email, { message: "Email is not valid." });
	});

	ngOnInit() {
		this.loadInvitations();
	}

	private loadInvitations() {
		this.invitationAdminService.list().subscribe({
			next: invitations => this.invitations.set(invitations)
		});
	}

	protected openInvite() {
		this.inviteModel.set({ email: "" });
		this.inviteForm().reset();
		this.inviteError.set("");
		this.showInviteModal.set(true);
	}

	protected closeInvite() {
		this.showInviteModal.set(false);
	}

	protected submitInvite(event: Event) {
		event.preventDefault();
		if (this.isInviting()) return;

		if (this.inviteForm().invalid()) {
			this.inviteForm().markAsTouched();
			return;
		}

		const { email: address } = this.inviteForm().value();
		this.isInviting.set(true);
		this.inviteError.set("");

		this.invitationAdminService.invite(address).subscribe({
			next: () => {
				this.isInviting.set(false);
				this.closeInvite();
				this.toast.success(`Invitation sent to ${address}.`);
				this.loadInvitations();
			},
			error: err => {
				this.isInviting.set(false);
				this.inviteError.set(this.inviteErrorMessage(err));
			}
		});
	}

	protected resend(invitation: AdminInvitation) {
		if (this.busyInvitationId()) return;
		this.busyInvitationId.set(invitation.id);

		this.invitationAdminService.invite(invitation.email).subscribe({
			next: () => {
				this.busyInvitationId.set(null);
				this.toast.success(`Invitation resent to ${invitation.email}.`);
				this.loadInvitations();
			},
			error: err => {
				this.busyInvitationId.set(null);
				if (err.status !== 409) {
					this.toast.warning(this.inviteErrorMessage(err));
				}
			}
		});
	}

	protected revoke(invitation: AdminInvitation) {
		if (this.busyInvitationId()) return;
		this.busyInvitationId.set(invitation.id);

		this.invitationAdminService.revoke(invitation.id).subscribe({
			next: () => {
				this.busyInvitationId.set(null);
				this.confirmingRevokeId.set(null);
				this.invitations.update(list =>
					list.filter(item => item.id !== invitation.id)
				);
				this.toast.success(
					`Invitation for ${invitation.email} revoked.`
				);
			},
			error: () => {
				this.busyInvitationId.set(null);
				this.toast.warning("Could not revoke the invitation.");
			}
		});
	}

	private inviteErrorMessage(err: {
		status?: number;
		error?: { title?: string };
	}): string {
		if (err.status === 409) return "This email already has an account.";
		if (err.status === 503) {
			return "Email delivery is not configured on the server.";
		}
		if (err.status === 502) {
			return "The email could not be sent. Try again in a moment.";
		}
		return err.error?.title ?? "Could not send the invitation.";
	}
}
