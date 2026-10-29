import { type Activity } from "../activity/activity.model";
import { type Backlog } from "../backlog/backlog.model";
import { type TrackedFranchiseEntry } from "../franchises/franchises.interface";
import { type List } from "../lists/list.model";
import { type BacklogSummary } from "../lists/lists.interface";
import { type Review } from "../reviews/review.model";
import { type ComparisonDimension } from "./schemas/comparison-query.schema";
import { type User } from "./user.model";
import {
	type HighlightsResult,
	type SectionAccess,
	type ThemeTier
} from "./users.types";

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
	access: SectionAccess;
}

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
		isFollowing: boolean;
		backlogSummaryMap: Map<string, BacklogSummary> | undefined;
		progress: { completed: number; total: number } | null;
	};
}

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

export interface ComparisonGameEntry {
	id: string;
	code: string;
	title: string;
	backgroundUrl: string | null | undefined;
}

export interface UserComparisonBundle {
	by: ComparisonDimension;
	inCommon: ComparisonGameEntry[];
	onlyViewer: ComparisonGameEntry[];
	onlyTarget: ComparisonGameEntry[];
	counts: {
		inCommon: number;
		onlyViewer: number;
		onlyTarget: number;
	};
}

export interface UserFranchisesBundle {
	franchises: TrackedFranchiseEntry[];
	total: number;
}

export interface UserReviewsBundle {
	user: User;
	reviewsPlain: Review[];
	durationMap: Map<string, number>;
	total: number;
}

export interface UserCardInsights {
	user: User;
	isSelf: boolean;
	profileVisible: boolean;
	followerCount: number | null;
	isFollowing: boolean;
	gamesTotal: number | null;
	completedTotal: number | null;
	featuredGame: { title: string; backgroundUrl: string | null } | null;
}

export interface UserConnectionCardsBundle {
	cards: UserCardInsights[];
	total: number;
}

export interface ThemeEntry {
	id: string;
	tier: ThemeTier;
}

export interface FeaturedFavoriteRow {
	userId: string;
	title: string | null;
	backgroundUrl: string | null;
}

export interface ComparisonOptions {
	includeOnlyTarget: boolean;
	includeOnlyViewer: boolean;
	limit?: number;
	offset: number;
}
