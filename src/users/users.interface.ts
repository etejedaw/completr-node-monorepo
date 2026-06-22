import { User } from "./user.model";
import { Activity } from "../activity/activity.model";
import { Backlog } from "../backlog/backlog.model";

export interface RestrictedUserProfile {
	kind: "restricted";
	user: User;
	followerCount: number;
	followingCount: number;
	isFollowing: boolean;
	hasPendingRequest: boolean;
}

export interface FullUserProfile {
	kind: "full";
	user: User;
	isSelf: boolean;
	backlogs: Backlog[];
	backlogTotal: number;
	backlogStats: BacklogStatusCounts;
	listsTotal: number;
	recentActivity: Activity[];
	followerCount: number;
	followingCount: number;
	isFollowing: boolean;
}

export type UserProfileResult = RestrictedUserProfile | FullUserProfile;

export interface BacklogStatusCounts {
	not_started: number;
	playing: number;
	completed: number;
	abandoned: number;
	endless: number;
	total: number;
}
