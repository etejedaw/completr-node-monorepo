import { type Activity } from "../activity/activity.model";
import { type RefreshToken } from "../auth/refresh-token.model";
import { type CoopMemberSummary } from "../backlog/backlog.interface";
import { type Backlog } from "../backlog/backlog.model";
import { type BacklogProgress } from "../backlog-progress/backlog-progress.model";
import { type Favorite } from "../favorites/favorite.model";
import { type UserFranchise } from "../franchises/user-franchise.model";
import { type GamePlatinum } from "../game-platinum/game-platinum.model";
import { type GameReport } from "../game-reports/game-report.model";
import { type GameShelf } from "../game-shelf/game-shelf.model";
import { type Game } from "../games/game.model";
import { type ListFollower } from "../list-followers/list-follower.model";
import { type List } from "../lists/list.model";
import { type MoodTagMeta } from "../mood-tags/mood-tag-meta.model";
import { type UserGameTag } from "../mood-tags/user-game-tag.model";
import { type PremiumStatus } from "../premium-access/premium-access.interface";
import { type PremiumGrant } from "../premium-access/premium-grant.model";
import { type Queue } from "../queue/queue.model";
import { type Review } from "../reviews/review.model";
import { type Rewind } from "../rewind/rewind.model";
import { type SavedFilter } from "../saved-filters/saved-filter.model";
import { type UserFollowRequest } from "../user-follow-requests/user-follow-request.model";
import { type UserFollower } from "../user-followers/user-follower.model";
import { type User } from "../users/user.model";
import { type Wishlist } from "../wishlist/wishlist.model";
import { type DataRequest } from "./data-request.model";
import {
	type DataRequestStatus,
	type DataRequestType
} from "./data-requests.constants";

export interface DataRequestResolution {
	status: Exclude<DataRequestStatus, "pending">;
	resolvedById: string;
	note?: string;
}

export interface DataRequestEmailDetails {
	requestId: string;
	type: DataRequestType;
	status: DataRequestStatus;
	username: string;
	requestedDate: string;
	dueDate: string;
	downloadableUntilDate: string | null;
	resolutionNote: string | null;
}

export interface DataRequestRecipient {
	username: string;
	email: string;
}

export interface DataRequestSnapshot {
	id: string;
	type: DataRequestType;
	status: DataRequestStatus;
	requestedAt: Date;
	resolvedAt: Date | null;
	resolutionNote: string | null;
}

export interface PersonalDataBundle {
	user: User;
	premiumStatus: PremiumStatus;
	premiumGrants: PremiumGrant[];
	backlog: Backlog[];
	backlogProgress: BacklogProgress[];
	coopPartnersByBacklog: Map<string, CoopMemberSummary[]>;
	queue: Queue[];
	gameShelf: GameShelf[];
	wishlist: Wishlist[];
	favorites: Favorite[];
	ownLists: List[];
	followedLists: ListFollower[];
	savedFilters: SavedFilter[];
	reviews: Review[];
	followers: UserFollower[];
	following: UserFollower[];
	followRequests: UserFollowRequest[];
	activities: Activity[];
	gameTags: UserGameTag[];
	tagMetas: MoodTagMeta[];
	taggedGames: Game[];
	trackedFranchises: UserFranchise[];
	platinums: GamePlatinum[];
	rewinds: Rewind[];
	sessions: RefreshToken[];
	gameReports: GameReport[];
	dataRequests: DataRequest[];
}

export interface PersonalDataGameReference {
	id: string;
	title: string;
	slug: string;
}
