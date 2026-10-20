import { type UserInvitation } from "./user-invitation.model";

export function invitationSerializer(invitation: UserInvitation) {
	return {
		id: invitation.id,
		email: invitation.email,
		createdAt: invitation.createdAt,
		expiresAt: invitation.expiresAt,
		isExpired: invitation.expiresAt < new Date()
	};
}
