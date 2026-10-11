import { type UserRole } from "../core/models/user.model";

export type NavAccess = "everyone" | "moderator" | "admin";

export interface NavItem {
	route: string;
	icon: string;
	label: string;
	iconColorClass: string;
	tooltip?: string;
	access?: NavAccess;
}

export interface NavSection {
	id: string;
	heading: string | null;
	moderatorHeading?: string;
	access?: NavAccess;
	pinnedToBottom?: boolean;
	items: NavItem[];
}

export const NAV_ACTIVE_CLASSES =
	"!border-brand !text-brand !bg-brand-subtle [&_.nav-icon]:opacity-100 [&_.nav-icon]:!text-brand";

export const NAV_SECTIONS: readonly NavSection[] = [
	{
		id: "home",
		heading: null,
		items: [
			{
				route: "/feed",
				icon: "dynamic_feed",
				label: "Feed",
				iconColorClass: "text-nav-feed",
				tooltip: "Activity from people you follow"
			}
		]
	},
	{
		id: "library",
		heading: "Library",
		items: [
			{
				route: "/backlog",
				icon: "list_alt",
				label: "My Games",
				iconColorClass: "text-nav-backlog",
				tooltip:
					"Every game you've played, are playing, or want to play"
			},
			{
				route: "/queue",
				icon: "playlist_play",
				label: "Up Next",
				iconColorClass: "text-nav-queue",
				tooltip: "Your priority queue of games to play next"
			},
			{
				route: "/game-shelf",
				icon: "shelves",
				label: "My Shelf",
				iconColorClass: "text-nav-shelf",
				tooltip: "Games you own, physical or digital"
			},
			{
				route: "/wishlist",
				icon: "favorite_border",
				label: "Want to Get",
				iconColorClass: "text-nav-wishlist",
				tooltip: "Games you want to acquire someday"
			},
			{
				route: "/favorites",
				icon: "star",
				label: "Favorites",
				iconColorClass: "text-nav-favorites",
				tooltip: "Your all-time favorite games"
			},
			{
				route: "/saved-views",
				icon: "bookmark",
				label: "Saved Views",
				iconColorClass: "text-nav-saved-views",
				tooltip: "Saved combinations of backlog filters"
			},
			{
				route: "/tags",
				icon: "label",
				label: "Tags",
				iconColorClass: "text-nav-tags",
				tooltip: "Manage your personal tags"
			}
		]
	},
	{
		id: "discover",
		heading: "Discover",
		items: [
			{
				route: "/games",
				icon: "sports_esports",
				label: "Browse",
				iconColorClass: "text-nav-browse",
				tooltip: "Browse the full game catalog"
			},
			{
				route: "/lists",
				icon: "format_list_bulleted",
				label: "Lists",
				iconColorClass: "text-nav-lists",
				tooltip: "Curated game lists, yours and from others"
			},
			{
				route: "/users",
				icon: "groups",
				label: "Users",
				iconColorClass: "text-nav-users",
				tooltip: "Find other players on Completr"
			}
		]
	},
	{
		id: "admin",
		heading: "Admin",
		moderatorHeading: "Moderator",
		access: "moderator",
		items: [
			{
				route: "/admin/users",
				icon: "people",
				label: "Users",
				iconColorClass: "text-nav-admin",
				access: "admin"
			},
			{
				route: "/admin/games",
				icon: "videogame_asset",
				label: "Games",
				iconColorClass: "text-nav-admin"
			},
			{
				route: "/admin/franchises",
				icon: "collections_bookmark",
				label: "Franchises",
				iconColorClass: "text-nav-admin"
			},
			{
				route: "/admin/reports",
				icon: "flag",
				label: "Reports",
				iconColorClass: "text-nav-admin"
			},
			{
				route: "/admin/audit",
				icon: "history",
				label: "Audit Log",
				iconColorClass: "text-nav-admin",
				access: "admin"
			},
			{
				route: "/admin/jobs",
				icon: "sync",
				label: "Jobs",
				iconColorClass: "text-nav-admin",
				access: "admin"
			}
		]
	},
	{
		id: "more",
		heading: "More",
		pinnedToBottom: true,
		items: [
			{
				route: "/help",
				icon: "help_outline",
				label: "Help",
				iconColorClass: "text-nav-more",
				tooltip: "Help, glossary and quick tour"
			},
			{
				route: "/whats-new",
				icon: "campaign",
				label: "What's new",
				iconColorClass: "text-nav-more",
				tooltip: "What's new on Completr"
			},
			{
				route: "/about",
				icon: "info_outline",
				label: "About",
				iconColorClass: "text-nav-more",
				tooltip: "About Completr"
			}
		]
	}
];

const ROLES_BY_RESTRICTED_ACCESS: Record<
	Exclude<NavAccess, "everyone">,
	readonly UserRole[]
> = {
	moderator: ["moderator", "admin"],
	admin: ["admin"]
};

function canAccess(
	access: NavAccess = "everyone",
	role: UserRole | undefined
): boolean {
	if (access === "everyone") return true;
	return !!role && ROLES_BY_RESTRICTED_ACCESS[access].includes(role);
}

function resolveHeading(
	section: NavSection,
	role: UserRole | undefined
): string | null {
	if (section.moderatorHeading && role === "moderator") {
		return section.moderatorHeading;
	}
	return section.heading;
}

export function visibleNavSections(role: UserRole | undefined): NavSection[] {
	return NAV_SECTIONS.filter(section => canAccess(section.access, role))
		.map(section => ({
			...section,
			heading: resolveHeading(section, role),
			items: section.items.filter(item => canAccess(item.access, role))
		}))
		.filter(section => section.items.length > 0);
}
