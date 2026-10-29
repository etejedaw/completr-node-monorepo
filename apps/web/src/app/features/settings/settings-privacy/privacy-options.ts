import { type VisibilityLevel } from "../../../core/models/user.model";
import { NAV_SECTIONS } from "../../../layout/nav-sections";
import { type SegmentedOption } from "../../../shared/components/segmented-control/segmented-control.model";
import {
	type PrivacyMode,
	type PrivacyPreset,
	type PrivacySection,
	type PrivacySectionConfig,
	type PrivacySectionDisplay,
	type PrivacySectionGroup,
	type SectionVisibilityKey
} from "./privacy-options.model";

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
			},
			{
				key: "platinumVisibility",
				description: "The games you've platinumed and when.",
				display: {
					title: "Platinums",
					icon: "emoji_events",
					iconColor: "text-platinum"
				}
			},
			{
				key: "franchiseVisibility",
				route: "/franchises",
				description: "The sagas you track, shown on your profile."
			},
			{
				key: "rewindVisibility",
				description:
					"Your yearly Rewind: games finished, hours played and highlights.",
				display: {
					title: "Rewind",
					icon: "history",
					iconColor: "text-brand"
				}
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

function navDisplay(route: string): PrivacySectionDisplay {
	const navItem = NAV_ITEMS_BY_ROUTE.get(route)!;
	return {
		title: navItem.label,
		icon: navItem.icon,
		iconColor: navItem.iconColorClass
	};
}

export const PRIVACY_SECTION_GROUPS: PrivacySectionGroup<PrivacySection>[] =
	PRIVACY_SECTION_CONFIG.map(group => ({
		title: group.title,
		sections: group.sections.map(({ display, ...section }) => ({
			...section,
			...(display ?? navDisplay(section.route!))
		}))
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
