import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

import { environmentConfig } from "../common/config/environment.config";
import { type Rewind, type RewindGameRef } from "../rewind/rewind.interface";
import {
	BACKDROP_FETCH_WIDTH,
	SHARE_IMAGE_CACHE_SIZE,
	SHARE_IMAGE_SIZES
} from "./rewind-share.constants";
import {
	type RewindImageFormat,
	type ShareArtwork,
	type ShareCover,
	type SharePageMeta
} from "./rewind-share.interface";
import { type SatoriElement } from "./templates/elements.template";
import { OG_COVER_LIMIT, ogTemplate } from "./templates/og.template";
import { sharePageTemplate } from "./templates/share-page.template";
import { STORY_COVER_LIMIT, storyTemplate } from "./templates/story.template";
import { fetchImageDataUri } from "./utils/fetch-image.util";
import { hashRewind } from "./utils/hash-rewind.util";
import { loadShareFonts } from "./utils/load-share-fonts.util";
import { LruCache } from "./utils/lru-cache.util";
import { rewindSummary } from "./utils/rewind-summary.util";
import { selectBackdropUrl } from "./utils/select-backdrop-url.util";
import { selectShareCovers } from "./utils/select-share-covers.util";

interface RenderedImage {
	png: Buffer;
	hasMissingImages: boolean;
}

const GENERIC_SHARE_TITLE = "Completr Rewind";
const GENERIC_SHARE_DESCRIPTION =
	"Every year in games, one page each. See it on Completr.";
const LEADING_WWW = /^www\./;
const TRAILING_SLASHES = /\/+$/;

const COVER_LIMITS: Record<RewindImageFormat, number> = {
	story: STORY_COVER_LIMIT,
	og: OG_COVER_LIMIT
};

const imageCache = new LruCache<Promise<RenderedImage>>(SHARE_IMAGE_CACHE_SIZE);

function webAppHost(): string {
	return new URL(environmentConfig.WEB_APP_URL).host.replace(LEADING_WWW, "");
}

function baseUrl(url: string): string {
	return url.replace(TRAILING_SLASHES, "");
}

interface LoadedCover extends ShareCover {
	failedToLoad: boolean;
}

interface LoadedArtwork extends ShareArtwork {
	hasMissingImages: boolean;
}

function failedToLoad(url: string | null, dataUri: string | null): boolean {
	return Boolean(url) && !dataUri;
}

async function loadCover(game: RewindGameRef): Promise<LoadedCover> {
	const dataUri = await fetchImageDataUri(game.coverUrl);
	return {
		gameId: game.gameId,
		title: game.title,
		dataUri,
		failedToLoad: failedToLoad(game.coverUrl, dataUri)
	};
}

async function loadArtwork(
	rewind: Rewind,
	format: RewindImageFormat
): Promise<LoadedArtwork> {
	const games = selectShareCovers(rewind, COVER_LIMITS[format]);
	const backdropUrl = selectBackdropUrl(rewind);
	const [covers, backdrop] = await Promise.all([
		Promise.all(games.map(loadCover)),
		fetchImageDataUri(backdropUrl, BACKDROP_FETCH_WIDTH)
	]);
	return {
		covers,
		backdrop,
		hasMissingImages:
			failedToLoad(backdropUrl, backdrop) ||
			covers.some(cover => cover.failedToLoad)
	};
}

function imageTemplate(
	rewind: Rewind,
	artwork: ShareArtwork,
	format: RewindImageFormat
): SatoriElement {
	if (format === "og") return ogTemplate({ rewind, artwork });
	return storyTemplate({ rewind, artwork, host: webAppHost() });
}

export async function renderRewindImage(
	rewind: Rewind,
	format: RewindImageFormat
): Promise<RenderedImage> {
	const artwork = await loadArtwork(rewind, format);
	const { width, height } = SHARE_IMAGE_SIZES[format];
	const svg = await satori(imageTemplate(rewind, artwork, format), {
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

function imageCacheKey(rewind: Rewind, format: RewindImageFormat): string {
	return [rewind.user.username, rewind.year, format, hashRewind(rewind)].join(
		":"
	);
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
			title: GENERIC_SHARE_TITLE,
			description: GENERIC_SHARE_DESCRIPTION,
			imageUrl: null,
			redirectUrl
		};
	}
	return {
		title: `@${rewind.user.username}'s ${rewind.year} Rewind`,
		description: rewindSummary(rewind.totals),
		imageUrl: ogImageUrl(rewind.user.username, rewind.year),
		redirectUrl
	};
}

export function renderSharePage(
	username: string,
	year: number,
	rewind: Rewind | null
): string {
	return sharePageTemplate(sharePageMeta(username, year, rewind));
}
