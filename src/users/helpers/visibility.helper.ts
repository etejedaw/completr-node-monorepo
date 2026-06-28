import * as userFollowersService from "../../user-followers/user-followers.service";
import { VisibilitySection } from "../constants/visibility.constants";
import { User } from "../user.model";

const SECTION_TO_FIELD: Record<VisibilitySection, keyof User> = {
	profile: "profileVisibility",
	queue: "queueVisibility",
	wishlist: "wishlistVisibility",
	favorite: "favoriteVisibility",
	feed: "feedVisibility",
	backlog: "backlogVisibility",
	shelf: "shelfVisibility",
	list: "listVisibility"
};

export async function canView(
	viewerId: string | undefined,
	owner: User,
	section: VisibilitySection
): Promise<boolean> {
	if (viewerId && viewerId === owner.id) return true;

	const level = owner[SECTION_TO_FIELD[section]];
	if (level === "public") return true;
	if (level === "private") return false;

	if (!viewerId) return false;
	return userFollowersService.areMutualFollowers(viewerId, owner.id);
}
