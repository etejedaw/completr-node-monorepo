import { type Activity } from "../activity/activity.model";
import { type Backlog } from "../backlog/backlog.model";
import { type findHighlightsByUserId } from "../backlog/backlog.service";
import { type List } from "../lists/list.model";
import { type BacklogSummary } from "../lists/lists.service";
import { type Review } from "../reviews/review.model";
import { type User } from "./user.model";

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

export interface EnrichedUserList {
	list: List;
	followerCount: number;
	progress: { completed: number; total: number };
}

export interface UserListsBundle {
	lists: EnrichedUserList[];
	total: number;
}

export interface UserFollowingListsBundle {
	followingLists: List[];
	total: number;
}

export interface UserListDetailBundle {
	profileUser: { username: string; name: string };
	listPlain: List;
	aggregates: {
		followerCount: number;
		backlogSummaryMap: Map<string, BacklogSummary> | undefined;
		progress: { completed: number; total: number } | null;
	};
}

export type HighlightsResult = Awaited<
	ReturnType<typeof findHighlightsByUserId>
>;

export interface UserHighlightsBundle {
	isSelf: boolean;
	highlights: HighlightsResult;
}

export interface UserCompletionsBundle {
	isSelf: boolean;
	rows: Backlog[];
	reviewMap: Map<string, { content: string | null; rating: number | null }>;
	total: number;
}

export interface GameInCommonEntry {
	id: string;
	code: string;
	title: string;
	backgroundUrl: string | null | undefined;
}

export interface UserGamesInCommonBundle {
	games: GameInCommonEntry[];
	total: number;
}

export interface UserReviewsBundle {
	user: User;
	reviewsPlain: Review[];
	durationMap: Map<string, number>;
	total: number;
}
