import { type CommunityTag } from "../../../core/services/mood-tags.model";

export interface CommunityTagSuggestionsOptions {
	gameId: () => string | undefined;
}

export interface LoadedCommunityTags {
	gameId: string;
	tags: CommunityTag[];
}
