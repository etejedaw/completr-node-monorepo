import { type VisibilityLevel } from "../../core/models";

export interface UpdateProfileDto {
	name?: string;
	bio?: string;
	avatarUrl?: string | null;
	profileVisibility?: VisibilityLevel;
	queueVisibility?: VisibilityLevel;
	wishlistVisibility?: VisibilityLevel;
	favoriteVisibility?: VisibilityLevel;
	feedVisibility?: VisibilityLevel;
	backlogVisibility?: VisibilityLevel;
	shelfVisibility?: VisibilityLevel;
	listVisibility?: VisibilityLevel;
	platinumVisibility?: VisibilityLevel;
	franchiseVisibility?: VisibilityLevel;
	rewindVisibility?: VisibilityLevel;
	rewindIgnoresProfileVisibility?: boolean;
	acceptFollowRequests?: boolean;
}
