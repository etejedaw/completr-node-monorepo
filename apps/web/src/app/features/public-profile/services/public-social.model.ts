import { type UserResult } from "../../../core/services/users.model";

export type ConnectionsQuery = {
	limit?: number;
	offset?: number;
	search?: string;
};

export interface ConnectionsPage {
	users: UserResult[];
	total: number;
}

export interface FollowResult {
	status: "accepted" | "pending";
	targetId: string;
}
