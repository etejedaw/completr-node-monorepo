import { type findHighlightsByUserId } from "../backlog/backlog.service";
import { type VisibilitySection } from "./constants/visibility.constants";
import {
	type FullUserProfile,
	type RestrictedUserProfile,
	type UserCardInsights
} from "./users.interface";

export type ThemeTier = "free" | "premium";

export type SectionAccess = Record<VisibilitySection, boolean>;

export type FeaturedGame = UserCardInsights["featuredGame"];

export type GameEntryRow = {
	gameId: string;
	Game?: {
		id: string;
		code: string;
		title: string;
		backgroundUrl?: string | null;
	};
};

export type UserProfileResult = RestrictedUserProfile | FullUserProfile;

export type HighlightsResult = Awaited<
	ReturnType<typeof findHighlightsByUserId>
>;
