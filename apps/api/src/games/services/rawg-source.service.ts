import { apiKeysConfig } from "../../common/config/api-keys.config";
import * as rawgServiceError from "../../rawg/errors/rawg.service-error";
import { RawgClient } from "../../rawg/rawg.provider";

export const rawg = RawgClient.create(apiKeysConfig.RAWG_API_KEY);

export function assertRawgEnabled() {
	if (!rawg.isEnabled) throw rawgServiceError.disabledError();
}

export async function findRawgIdBySlug(slug: string) {
	const detail = await rawg.getGameBySlug(slug);
	return detail.id ?? null;
}
