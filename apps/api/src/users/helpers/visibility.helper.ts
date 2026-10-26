import { literal } from "sequelize";

import { sequelize } from "../../database/sequelize.database";
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
	list: "listVisibility",
	platinum: "platinumVisibility"
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

export function isSectionVisible(
	viewerId: string | undefined,
	owner: User,
	section: VisibilitySection,
	isMutual: boolean
): boolean {
	if (viewerId && viewerId === owner.id) return true;

	const level = owner[SECTION_TO_FIELD[section]];
	if (level === "public") return true;
	if (level === "private") return false;

	return !!viewerId && isMutual;
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

export async function canViewList(
	viewerId: string | undefined,
	owner: User,
	list: { isPublic: boolean }
): Promise<boolean> {
	if (viewerId && viewerId === owner.id) return true;
	if (!list.isPublic) return false;
	return (
		(await canView(viewerId, owner, "profile")) &&
		(await canView(viewerId, owner, "list"))
	);
}

const LIST_OWNER_ALIAS = "list_owner";

function mutualFollowersSql(viewerSql: string, ownerIdSql: string) {
	const followsOwner = `EXISTS (SELECT 1 FROM "UserFollowers" AS "viewer_follow" WHERE "viewer_follow"."followerId" = ${viewerSql} AND "viewer_follow"."followingId" = ${ownerIdSql})`;
	const followedByOwner = `EXISTS (SELECT 1 FROM "UserFollowers" AS "owner_follow" WHERE "owner_follow"."followerId" = ${ownerIdSql} AND "owner_follow"."followingId" = ${viewerSql})`;
	return `${followsOwner} AND ${followedByOwner}`;
}

function sectionAllowsSql(
	section: VisibilitySection,
	viewerId: string | undefined,
	ownerAlias = LIST_OWNER_ALIAS
) {
	const column = `"${ownerAlias}"."${SECTION_TO_FIELD[section]}"`;
	if (!viewerId) return `${column} = 'public'`;

	const mutual = mutualFollowersSql(
		sequelize.escape(viewerId),
		`"${ownerAlias}"."id"`
	);
	return `(${column} = 'public' OR (${column} = 'friends' AND ${mutual}))`;
}

const SECTION_OWNER_ALIAS = "section_owner";

export function sectionVisibleToViewerSql(
	section: VisibilitySection,
	viewerId: string | undefined,
	ownerIdSql: string
) {
	const asOwner = viewerId
		? `${ownerIdSql} = ${sequelize.escape(viewerId)} OR `
		: "";
	const ownerAllows = `EXISTS (SELECT 1 FROM "Users" AS "${SECTION_OWNER_ALIAS}" WHERE "${SECTION_OWNER_ALIAS}"."id" = ${ownerIdSql} AND ${sectionAllowsSql(section, viewerId, SECTION_OWNER_ALIAS)})`;
	return `(${asOwner}${ownerAllows})`;
}

export function visibleListsCondition(
	viewerId: string | undefined,
	listAlias = "List"
) {
	const ownerId = `"${listAlias}"."userId"`;
	const asOwner = viewerId
		? `${ownerId} = ${sequelize.escape(viewerId)} OR `
		: "";
	const ownerAllows = `EXISTS (SELECT 1 FROM "Users" AS "${LIST_OWNER_ALIAS}" WHERE "${LIST_OWNER_ALIAS}"."id" = ${ownerId} AND ${sectionAllowsSql("profile", viewerId)} AND ${sectionAllowsSql("list", viewerId)})`;

	return literal(
		`(${asOwner}("${listAlias}"."isPublic" = true AND ${ownerAllows}))`
	);
}
