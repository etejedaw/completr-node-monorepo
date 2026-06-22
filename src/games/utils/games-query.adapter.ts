import { GamesQuery } from "../schemas/games-query.schema";
import { GamesQueryOptions } from "../games.interface";

export function mapGamesQueryToOptions(query: GamesQuery): GamesQueryOptions {
	return {
		pagination: { limit: query.limit, offset: query.offset },
		sort: { by: query.sort_by, order: query.sort_order },
		search: query.search,
		filters: {
			genres: resolveGenres(query),
			platforms: query.platforms,
			releaseYear: {
				from: query.release_year_from,
				to: query.release_year_to
			},
			score: { min: query.min_score, max: query.max_score },
			duration: { min: query.min_duration, max: query.max_duration },
			flags: {
				isDlc: query.is_dlc,
				isCompilation: query.is_compilation,
				excludeCompilations: query.exclude_compilations
			},
			status: {
				includeInactive: query.include_inactive,
				onlyInactive: query.only_inactive
			},
			missing: {
				scores: query.no_scores,
				times: query.no_times,
				platforms: query.no_platforms
			},
			excludedSources: {
				scoreSources: query.no_score_source,
				timeSources: query.no_time_source
			}
		}
	};
}

function resolveGenres(query: GamesQuery): readonly string[] | undefined {
	if (query.genres && query.genres.length > 0) return query.genres;
	if (query.genre) return [query.genre];
	return undefined;
}
