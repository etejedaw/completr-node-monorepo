import { ScoreSource } from "../../game-scores/game-score.model";
import { TimeSource } from "../../game-times/game-time.model";
import { RawgGameDetail } from "../../rawg/rawg.interface";
import { RegisterGameDto } from "../dtos/register-game.dto";
import { mapRawgPlatformSlugs } from "./rawg-platform.map";

export interface GameScoreEntry {
	source: ScoreSource;
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
			coverUrl: rawgGame.background_image ?? undefined,
			platforms: mapPlatforms(rawgGame.platforms),
			genres: []
		},
		enrichment: {
			scores: mapScores(rawgGame.metacritic),
			times: mapTimes(rawgGame.playtime),
			genreSlugs: rawgGame.genres.map(g => g.slug)
		}
	};
}

function mapScores(metacritic: number | null): GameScoreEntry[] {
	if (!metacritic) return [];
	return [{ source: "metacritic", score: metacritic }];
}

function mapTimes(playtime: number): GameTimeEntry[] {
	if (playtime <= 0) return [];
	return [{ source: "rawg", duration: playtime }];
}

function mapPlatforms(platforms: RawgGameDetail["platforms"]): string[] {
	const slugs = platforms.map(p => p.platform.slug);
	return mapRawgPlatformSlugs(slugs);
}
