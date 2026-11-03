export interface AdminActionsState {
	confirmDeactivate: boolean;
	confirmDelete: boolean;
	editor: boolean;
	deactivating: boolean;
	deleting: boolean;
}

export type GameAdminAction = "deactivate" | "delete";
