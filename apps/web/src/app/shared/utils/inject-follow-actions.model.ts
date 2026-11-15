import { type UserResult } from "../../core/services/users.model";

export type FollowState = "none" | "following" | "requested";

export interface FollowSubject extends UserResult {
	hasPendingRequest?: boolean;
}
