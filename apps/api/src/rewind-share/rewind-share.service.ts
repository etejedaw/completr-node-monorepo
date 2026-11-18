import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

import { environmentConfig } from "../common/config/environment.config";
import { ServiceError } from "../common/errors/service-error";
import * as rewindServiceError from "../rewind/errors/rewind.service-error";
import { type Rewind, type RewindGameRef } from "../rewind/rewind.interface";
import * as rewindService from "../rewind/rewind.service";
import {
	MISSING_REWIND_CODES,
	type RewindImageFormat,
	SHARE_IMAGE_CACHE_SIZE,
	SHARE_IMAGE_SIZES
} from "./rewind-share.constants";
import {
	type GuestRewindLookup,
	type LoadedArtwork,
	type LoadedCover,
	type RenderedImage,
	type ShareArtwork,
	type SharePageMeta
} from "./rewind-share.interface";
import {
	type SatoriElement,
	type ShareFormatTemplate
} from "./rewind-share-template.interface";
import {
	hasShareImage,
	shareFormatTemplate
} from "./templates/share-designs.template";
import { sharePageTemplate } from "./templates/share-page.template";
import { fetchImageDataUri } from "./utils/fetch-image.util";
import { hashRewind } from "./utils/hash-rewind.util";
import { loadShareFonts } from "./utils/load-share-fonts.util";
import { LruCache } from "./utils/lru-cache.util";
import { rewindSummary } from "./utils/rewind-summary.util";
import { selectShareCovers } from "./utils/select-share-covers.util";
import { shareCopy } from "./utils/share-copy.util";
import { sharePosterUrl } from "./utils/share-poster-url.util";

const GENERIC_SHARE_TITLE = "Completr Rewind";
const GENERIC_SHARE_DESCRIPTION =
	"Every year in games, one page each. See it on Completr.";
const GENERIC_SHARE_COPY = shareCopy("en");
const LEADING_WWW = /^www\./;
const TRAILING_SLASHES = /\/+$/;

const imageCache = new LruCache<Promise<RenderedImage>>(SHARE_IMAGE_CACHE_SIZE);

function webAppHost(): string {
	return new URL(environmentConfig.WEB_APP_URL).host.replace(LEADING_WWW, "");
}

function baseUrl(url: string): string {
	return url.replace(TRAILING_SLASHES, "");
}

function failedToLoad(url: string | null, dataUri: string | null): boolean {
	return Boolean(url) && !dataUri;
}

async function loadCover(game: RewindGameRef): Promise<LoadedCover> {
	const posterUrl = sharePosterUrl(game);
	const dataUri = await fetchImageDataUri(posterUrl);
	return {
		gameId: game.gameId,
		title: game.title,
		dataUri,
		failedToLoad: failedToLoad(posterUrl, dataUri)
	};
}

async function loadArtwork(
	rewind: Rewind,
	template: ShareFormatTemplate
): Promise<LoadedArtwork> {
	const games = selectShareCovers(rewind, template.coverLimit);
	const covers = await Promise.all(games.map(loadCover));
	return {
		covers,
		hasMissingImages: covers.some(cover => cover.failedToLoad)
	};
}

function imageTemplate(
	rewind: Rewind,
	artwork: ShareArtwork,
	template: ShareFormatTemplate
): SatoriElement {
	return template.render({ rewind, artwork, host: webAppHost() });
}

export async function renderRewindImage(
	rewind: Rewind,
	format: RewindImageFormat
): Promise<RenderedImage> {
	const template = shareFormatTemplate(rewind.design, format);
	if (!template) throw rewindServiceError.notFoundError();
	const artwork = await loadArtwork(rewind, template);
	const { width, height } = SHARE_IMAGE_SIZES[format];
	const svg = await satori(imageTemplate(rewind, artwork, template), {
		width,
		height,
		fonts: loadShareFonts()
	});
	const png = new Resvg(svg, {
		fitTo: { mode: "original" },
		font: { loadSystemFonts: false }
	})
		.render()
		.asPng();
	return { png, hasMissingImages: artwork.hasMissingImages };
}

export function hasRewindImage(
	rewind: Rewind,
	format: RewindImageFormat
): boolean {
	if (!hasShareImage(rewind.design, format)) return false;
	return format !== "story-list" || rewind.finishedGames.length > 0;
}

function imageCacheKey(rewind: Rewind, format: RewindImageFormat): string {
	return [
		rewind.user.username,
		rewind.year,
		rewind.language,
		rewind.design,
		format,
		hashRewind(rewind)
	].join(":");
}

function forgetEntry(key: string, rendering: Promise<RenderedImage>): void {
	if (imageCache.get(key) === rendering) imageCache.delete(key);
}

export async function getRewindImage(
	rewind: Rewind,
	format: RewindImageFormat
): Promise<Buffer> {
	const key = imageCacheKey(rewind, format);
	const cached = imageCache.get(key);
	if (cached) return (await cached).png;

	const rendering = renderRewindImage(rewind, format);
	imageCache.set(key, rendering);
	try {
		const image = await rendering;
		if (image.hasMissingImages) forgetEntry(key, rendering);
		return image.png;
	} catch (error) {
		forgetEntry(key, rendering);
		throw error;
	}
}

export function clearRewindImagesOf(username: string): void {
	imageCache.deleteKeysStartingWith(`${username}:`);
}

export function clearRewindImageCache(): void {
	imageCache.clear();
}

export function rewindImageCacheSize(): number {
	return imageCache.size;
}

function rewindPageUrl(username: string, year: number): string {
	return `${baseUrl(environmentConfig.WEB_APP_URL)}/user/${encodeURIComponent(username)}/rewind/${year}`;
}

function ogImageUrl(username: string, year: number): string {
	return `${baseUrl(environmentConfig.WEB_APP_URL)}/share/rewind/${encodeURIComponent(username)}/${year}/og.png`;
}

function sharePageMeta(
	username: string,
	year: number,
	rewind: Rewind | null
): SharePageMeta {
	const redirectUrl = rewindPageUrl(username, year);
	if (!rewind) {
		return {
			language: GENERIC_SHARE_COPY.language,
			title: GENERIC_SHARE_TITLE,
			description: GENERIC_SHARE_DESCRIPTION,
			imageUrl: null,
			continueLink: GENERIC_SHARE_COPY.continueLink,
			redirectUrl
		};
	}
	const copy = shareCopy(rewind.language);
	return {
		language: copy.language,
		title: copy.pageTitle(rewind.user.username, rewind.year),
		description: rewindSummary(rewind.totals, copy),
		imageUrl: hasShareImage(rewind.design, "og")
			? ogImageUrl(rewind.user.username, rewind.year)
			: null,
		continueLink: copy.continueLink,
		redirectUrl
	};
}

export async function findGuestRewind(
	username: string,
	year: number
): Promise<GuestRewindLookup> {
	try {
		return {
			rewind: await rewindService.getRewindForViewer(
				undefined,
				username,
				year
			),
			status: 200
		};
	} catch (error) {
		if (!(error instanceof ServiceError)) throw error;
		return {
			rewind: null,
			status: MISSING_REWIND_CODES.has(error.code) ? 404 : 200
		};
	}
}

export function renderSharePage(
	username: string,
	year: number,
	rewind: Rewind | null
): string {
	return sharePageTemplate(sharePageMeta(username, year, rewind));
}
