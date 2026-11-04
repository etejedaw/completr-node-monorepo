import { type IgdbGame } from "../../igdb/igdb.interface";
import { type GameScoreEntry, type RawgMappedData } from "../games.interface";
import { IGDB_SCORE_EXTRACTORS } from "./extractors/igdb-score.extractors";
import { extractSourceValues } from "./extractors/source-value-extractor";
import { mapIgdbGenreSlugs } from "./igdb-genre.map";
import { mapIgdbPlatformSlugs } from "./igdb-platform.map";

const IGDB_IMAGE_BASE_URL = "https://images.igdb.com/igdb/image/upload";
const IGDB_COVER_SIZE = "cover_big_2x";
const IGDB_IMAGE_ID_PATTERN = /^[\w-]+$/;
const MIN_RELEASE_YEAR = 1;
const MAX_RELEASE_YEAR = 9999;
const MILLISECONDS_PER_SECOND = 1000;

export function igdbToGameMapper(game: IgdbGame): RawgMappedData {
	return {
		game: {
			title: game.name,
			description: mapDescription(game.summary),
			releaseAt: mapReleaseDate(game.first_release_date),
			coverUrl: mapCoverUrl(game.cover?.image_id),
			platforms: mapIgdbPlatformSlugs(slugsOf(game.platforms)),
			genres: []
		},
		enrichment: {
			scores: mapScores(game),
			times: [],
			genreSlugs: mapGenres(game)
		}
	};
}

function slugsOf(refs: IgdbGame["platforms"]): string[] {
	return (refs ?? []).map(ref => ref.slug);
}

function mapDescription(summary: string | undefined): string | undefined {
	return summary?.trim() ? summary : undefined;
}

function mapReleaseDate(unixSeconds: number | undefined): string | undefined {
	if (typeof unixSeconds !== "number") return undefined;
	const date = new Date(unixSeconds * MILLISECONDS_PER_SECOND);
	if (Number.isNaN(date.getTime())) return undefined;
	const year = date.getUTCFullYear();
	if (year < MIN_RELEASE_YEAR || year > MAX_RELEASE_YEAR) return undefined;
	return date.toISOString().slice(0, 10);
}

function mapCoverUrl(imageId: string | undefined): string | undefined {
	if (!imageId || !IGDB_IMAGE_ID_PATTERN.test(imageId)) return undefined;
	return `${IGDB_IMAGE_BASE_URL}/t_${IGDB_COVER_SIZE}/${imageId}.jpg`;
}

function mapScores(game: IgdbGame): GameScoreEntry[] {
	return extractSourceValues(IGDB_SCORE_EXTRACTORS, game).map(
		({ source, value }) => ({ source, score: value })
	);
}

function mapGenres(game: IgdbGame): string[] {
	const slugs = [...slugsOf(game.genres), ...slugsOf(game.themes)];
	return mapIgdbGenreSlugs(slugs);
}
