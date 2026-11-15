import { type VisibilityLevel } from "../../../core/models/user.model";

export type SectionVisibilityKey =
	| "backlogVisibility"
	| "shelfVisibility"
	| "listVisibility"
	| "queueVisibility"
	| "wishlistVisibility"
	| "favoriteVisibility"
	| "feedVisibility"
	| "platinumVisibility"
	| "franchiseVisibility"
	| "rewindVisibility";

export interface PrivacyDraft extends Record<
	SectionVisibilityKey | "profileVisibility",
	VisibilityLevel
> {
	acceptFollowRequests: boolean;
}

export interface PrivacySectionDisplay {
	title: string;
	icon: string;
	iconColor: string;
}

export interface PrivacySectionConfig {
	key: SectionVisibilityKey;
	description: string;
	route?: string;
	display?: PrivacySectionDisplay;
}

export interface PrivacySection
	extends Omit<PrivacySectionConfig, "display">, PrivacySectionDisplay {}

export interface PrivacySectionGroup<T> {
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
