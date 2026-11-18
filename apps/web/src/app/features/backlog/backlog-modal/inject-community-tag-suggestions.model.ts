import { type CommunityTag } from "../../mood-tags/mood-tags.model";

export interface CommunityTagSuggestionsOptions {
	gameId: () => string | undefined;
}

export interface LoadedCommunityTags {
	gameId: string;
	tags: CommunityTag[];
}
