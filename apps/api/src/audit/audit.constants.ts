export const AUDIT_ACTIONS = {
	userCreated: "user_created",
	userEdited: "user_edited",
	userDeleted: "user_deleted",
	userDataExported: "user_data_exported",
	userInvited: "user_invited",
	invitationRevoked: "invitation_revoked"
} as const;

export const AUDIT_TARGET_TYPES = {
	user: "user",
	game: "game",
	invitation: "invitation",
	dataRequest: "data_request"
} as const;
