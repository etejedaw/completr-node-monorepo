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
	backdrop: string | null;
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

export interface ShareCopy {
	language: RewindLanguage;
	numberLocale: string;
	personas: Record<RewindPersonaCode, SharePersona>;
	ownerLabel: (username: string) => string;
	pageTitle: (username: string, year: number) => string;
	continueLink: string;
	tiles: {
		gamesFinished: ShareCountLabel;
		gamesStarted: ShareCountLabel;
		hoursPlayed: string;
		finishRate: string;
		platinums: ShareCountLabel;
		leftBehind: string;
		averageRating: string;
		genres: ShareCountLabel;
	};
	summary: {
		emptyYear: string;
		games: ShareCountLabel;
		finished: ShareCountLabel;
		leftBehind: ShareCountLabel;
		started: ShareCountLabel;
		lastSeparator: string;
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
