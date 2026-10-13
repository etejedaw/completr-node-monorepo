import * as userFollowersService from "../../user-followers/user-followers.service";
import {
	VISIBILITY_SECTIONS,
	type VisibilitySection
} from "../constants/visibility.constants";
import { type User } from "../user.model";

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

export type SectionAccess = Record<VisibilitySection, boolean>;

export async function resolveSectionAccess(
	viewerId: string | undefined,
	owner: User
): Promise<SectionAccess> {
	const isSelf = !!viewerId && viewerId === owner.id;
	const levels = VISIBILITY_SECTIONS.map(
		section => owner[SECTION_TO_FIELD[section]]
	);
	const needsMutualCheck =
		!isSelf && !!viewerId && levels.includes("friends");
	const isMutual = needsMutualCheck
		? await userFollowersService.areMutualFollowers(viewerId, owner.id)
		: false;

	return Object.fromEntries(
		VISIBILITY_SECTIONS.map((section, index) => [
			section,
			isSelf ||
				levels[index] === "public" ||
				(levels[index] === "friends" && isMutual)
		])
	) as SectionAccess;
}
