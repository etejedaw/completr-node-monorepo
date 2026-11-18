import {
	type RewindLanguage,
	type RewindPersonaCode
} from "../rewind/rewind.constants";
import { type Rewind } from "../rewind/rewind.interface";

export interface ShareCover {
	gameId: string;
	title: string;
	dataUri: string | null;
}

export interface ShareArtwork {
	covers: ShareCover[];
}

export interface SharePageMeta {
	language: RewindLanguage;
	title: string;
	description: string;
	imageUrl: string | null;
	continueLink: string;
	redirectUrl: string;
}

export interface SharePersona {
	title: string;
	phrase: string;
}

export interface ShareCountLabel {
	one: string;
	other: string;
}

export interface ShareTileLabels {
	gamesFinished: ShareCountLabel;
	gamesStarted: ShareCountLabel;
	hoursPlayed: string;
	finishRate: string;
	platinums: ShareCountLabel;
	leftBehind: string;
	averageRating: string;
	genres: ShareCountLabel;
}

export interface ShareGamesListCopy {
	presents: (username: string) => string;
	endings: ShareCountLabel;
	season: (year: number) => string;
	starring: string;
	and: string;
	moreGames: ShareCountLabel;
	finished: ShareCountLabel;
	hours: ShareCountLabel;
	finishRate: string;
}

export interface ShareCopy {
	language: RewindLanguage;
	numberLocale: string;
	personas: Record<RewindPersonaCode, SharePersona>;
	pageTitle: (username: string, year: number) => string;
	continueLink: string;
	yearCaption: (year: number, username: string) => string;
	tiles: ShareTileLabels;
	gamesList: ShareGamesListCopy;
	summary: {
		emptyYear: string;
		games: ShareCountLabel;
		finished: ShareCountLabel;
		leftBehind: ShareCountLabel;
		started: ShareCountLabel;
		lastSeparator: string;
	};
}

export interface Share2025Copy {
	eyebrow: (username: string) => string;
	tally: {
		finished: string;
		leftBehind: string;
		hoursPlayed: string;
		averageRating: string;
	};
}

export interface GuestRewindLookup {
	rewind: Rewind | null;
	status: number;
}

export interface RenderedImage {
	png: Buffer;
	hasMissingImages: boolean;
}

export interface LoadedCover extends ShareCover {
	failedToLoad: boolean;
}

export interface LoadedArtwork extends ShareArtwork {
	hasMissingImages: boolean;
}
