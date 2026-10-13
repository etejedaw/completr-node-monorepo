import { type VisibilityLevel } from "../../../core/models/user.model";
import { NAV_SECTIONS } from "../../../layout/nav-sections";
import { type SegmentedOption } from "../../../shared/components/segmented-control/segmented-control";

export type SectionVisibilityKey =
	| "backlogVisibility"
	| "shelfVisibility"
	| "listVisibility"
	| "queueVisibility"
	| "wishlistVisibility"
	| "favoriteVisibility"
	| "feedVisibility";

export interface PrivacyDraft extends Record<
	SectionVisibilityKey | "profileVisibility",
	VisibilityLevel
> {
	acceptFollowRequests: boolean;
}

interface PrivacySectionConfig {
	key: SectionVisibilityKey;
	route: string;
	description: string;
}

export interface PrivacySection extends PrivacySectionConfig {
	title: string;
	icon: string;
	iconColor: string;
}

interface PrivacySectionGroup<T> {
	title: string;
	sections: T[];
}

export type PrivacyMode = VisibilityLevel | "custom";

export interface PrivacyPreset {
	value: PrivacyMode;
	label: string;
	icon: string;
	description: string;
}

export const VISIBILITY_OPTIONS: SegmentedOption<VisibilityLevel>[] = [
	{
		value: "public",
		label: "Everyone",
		icon: "public",
		hint: "Anyone, even without an account"
	},
	{
		value: "friends",
		label: "Friends",
		icon: "group",
		hint: "Only people you follow and who follow you back"
	},
	{
		value: "private",
		label: "Only you",
		icon: "lock",
		hint: "Hidden from everyone else"
	}
];

export const PRIVACY_PRESETS: PrivacyPreset[] = [
	{
		value: "public",
		label: "Everyone",
		icon: "public",
		description: "Your profile and every section are open to anyone."
	},
	{
		value: "friends",
		label: "Friends",
		icon: "group",
		description: "Only people you follow and who follow you back see it."
	},
	{
		value: "private",
		label: "Only you",
		icon: "lock",
		description: "Visitors only see your avatar, name and bio."
	},
	{
		value: "custom",
		label: "Custom",
		icon: "tune",
		description: "Pick a level for each section yourself."
	}
];

export const PROFILE_GATE = {
	title: "Profile",
	description:
		"The front door. People who can't open it see nothing else, whatever each section says.",
	icon: "account_circle",
	iconColor: "text-brand"
};

const PRIVACY_SECTION_CONFIG: PrivacySectionGroup<PrivacySectionConfig>[] = [
	{
		title: "Library",
		sections: [
			{
				key: "backlogVisibility",
				route: "/backlog",
				description: "Your full game history, ratings and runs."
			},
			{
				key: "shelfVisibility",
				route: "/game-shelf",
				description: "The games you own and on which platform."
			}
		]
	},
	{
		title: "Collections",
		sections: [
			{
				key: "queueVisibility",
				route: "/queue",
				description: "The games you plan to play next, in order."
			},
			{
				key: "wishlistVisibility",
				route: "/wishlist",
				description: "Games you'd like to buy or get."
			},
			{
				key: "favoriteVisibility",
				route: "/favorites",
				description: "Your all-time favorite games."
			},
			{
				key: "listVisibility",
				route: "/lists",
				description: "The lists you create and follow."
			}
		]
	},
	{
		title: "Social",
		sections: [
			{
				key: "feedVisibility",
				route: "/feed",
				description: "Your activity in other players' feeds."
			}
		]
	}
];

const NAV_ITEMS_BY_ROUTE = new Map(
	NAV_SECTIONS.flatMap(section => section.items).map(item => [
		item.route,
		item
	])
);

export const PRIVACY_SECTION_GROUPS: PrivacySectionGroup<PrivacySection>[] =
	PRIVACY_SECTION_CONFIG.map(group => ({
		title: group.title,
		sections: group.sections.map(section => {
			const navItem = NAV_ITEMS_BY_ROUTE.get(section.route)!;
			return {
				...section,
				title: navItem.label,
				icon: navItem.icon,
				iconColor: navItem.iconColorClass
			};
		})
	}));

export const SECTION_KEYS: SectionVisibilityKey[] =
	PRIVACY_SECTION_CONFIG.flatMap(group =>
		group.sections.map(section => section.key)
	);

const VISIBILITY_RANK: Record<VisibilityLevel, number> = {
	private: 0,
	friends: 1,
	public: 2
};

export function effectiveVisibility(
	section: VisibilityLevel,
	profile: VisibilityLevel
): VisibilityLevel {
	return VISIBILITY_RANK[section] <= VISIBILITY_RANK[profile]
		? section
		: profile;
}

export function derivePrivacyMode(
	levels: Record<SectionVisibilityKey | "profileVisibility", VisibilityLevel>
): PrivacyMode {
	const values = new Set([
		levels.profileVisibility,
		...SECTION_KEYS.map(key => levels[key])
	]);
	return values.size === 1 ? [...values][0] : "custom";
}

export function visibilityLabel(level: VisibilityLevel): string {
	return VISIBILITY_OPTIONS.find(option => option.value === level)!.label;
}
