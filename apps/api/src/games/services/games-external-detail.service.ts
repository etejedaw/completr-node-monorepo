import * as igdbServiceError from "../../igdb/errors/igdb.service-error";
import * as scoreSourcesService from "../../score-sources/score-sources.service";
import {
	type ExternalGameDetail,
	type RawgMappedData
} from "../games.interface";
import { type OnlineSearchSource } from "../games.types";
import { igdbToGameMapper } from "../mappers/igdb-to-game.mapper";
import { rawgToGameMapper } from "../mappers/rawg-to-game.mapper";
import {
	getIgdbRequestPacer,
	getIgdbSource
} from "./external-data-sources.service";
import { rawg } from "./rawg-source.service";

export async function rawgDetailBySlug(
	slug: string
): Promise<ExternalGameDetail> {
	const detail = await rawg.getGameBySlug(slug);
	return toExternalGameDetail(
		"rawg",
		String(detail.id),
		rawgToGameMapper(detail)
	);
}

export async function igdbDetailBySlug(
	slug: string
): Promise<ExternalGameDetail> {
	const igdb = getIgdbSource();
	if (!igdb) throw igdbServiceError.disabledError();
	await getIgdbRequestPacer().waitForTurn();
	const detail = await igdb.getGameBySlug(slug);
	return toExternalGameDetail(
		"igdb",
		String(detail.id),
		igdbToGameMapper(detail)
	);
}

async function toExternalGameDetail(
	source: OnlineSearchSource,
	externalId: string,
	mapped: RawgMappedData
): Promise<ExternalGameDetail> {
	const scores = mapped.enrichment.scores ?? [];
	const catalogedSources = await scoreSourcesService.findExistingCodes(
		scores.map(score => score.source)
	);
	return {
		source,
		externalId,
		title: mapped.game.title,
		description: mapped.game.description ?? null,
		coverUrl: mapped.game.coverUrl ?? null,
		backgroundUrl: mapped.game.backgroundUrl ?? null,
		releaseAt: mapped.game.releaseAt ?? null,
		platforms: mapped.game.platforms ?? [],
		genres: mapped.enrichment.genreSlugs ?? [],
		scores: scores.filter(score => catalogedSources.has(score.source)),
		times: mapped.enrichment.times ?? []
	};
}
