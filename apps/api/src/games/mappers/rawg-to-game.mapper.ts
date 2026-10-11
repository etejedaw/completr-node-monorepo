import { type TimeSource } from "../../game-times/game-time.model";
import { type RawgGameDetail } from "../../rawg/rawg.interface";
import { type RegisterGameDto } from "../dtos/register-game.dto";
import { RAWG_SCORE_EXTRACTORS } from "./extractors/rawg-score.extractors";
import { RAWG_TIME_EXTRACTORS } from "./extractors/rawg-time.extractors";
import { extractSourceValues } from "./extractors/source-value-extractor";
import { mapRawgGenreSlugs } from "./rawg-genre.map";
import { mapRawgPlatformSlugs } from "./rawg-platform.map";
import { mapRawgTagSlugsToGenres } from "./rawg-tag-genre.map";

export interface GameScoreEntry {
	source: string;
	score: number;
}

export interface GameTimeEntry {
	source: TimeSource;
	duration: number;
}

export interface RegisterGameEnrichment {
	scores?: GameScoreEntry[];
	times?: GameTimeEntry[];
	genreSlugs?: string[];
}

interface RawgMappedData {
	game: RegisterGameDto;
	enrichment: RegisterGameEnrichment;
}

export function rawgToGameMapper(rawgGame: RawgGameDetail): RawgMappedData {
	return {
		game: {
			title: rawgGame.name,
			description: rawgGame.description_raw ?? undefined,
			releaseAt: rawgGame.released ?? undefined,
			backgroundUrl: rawgGame.background_image ?? undefined,
			platforms: mapPlatforms(rawgGame.platforms),
			genres: []
		},
		enrichment: {
			scores: mapScores(rawgGame),
			times: mapTimes(rawgGame),
			genreSlugs: mapGenres(rawgGame)
		}
	};
}

function mapScores(rawgGame: RawgGameDetail): GameScoreEntry[] {
	return extractSourceValues(RAWG_SCORE_EXTRACTORS, rawgGame).map(
		({ source, value }) => ({ source, score: value })
	);
}

function mapTimes(rawgGame: RawgGameDetail): GameTimeEntry[] {
	return extractSourceValues(RAWG_TIME_EXTRACTORS, rawgGame).map(
		({ source, value }) => ({ source, duration: value })
	);
}

function mapPlatforms(platforms: RawgGameDetail["platforms"]): string[] {
	const slugs = platforms.map(p => p.platform.slug);
	return mapRawgPlatformSlugs(slugs);
}

function mapGenres(rawgGame: RawgGameDetail): string[] {
	const fromGenres = mapRawgGenreSlugs(rawgGame.genres.map(g => g.slug));
	const tagSlugs = (rawgGame.tags ?? [])
		.filter(t => !t.language || t.language === "eng")
		.map(t => t.slug);
	const fromTags = mapRawgTagSlugsToGenres(tagSlugs);
	return Array.from(new Set([...fromGenres, ...fromTags]));
}
