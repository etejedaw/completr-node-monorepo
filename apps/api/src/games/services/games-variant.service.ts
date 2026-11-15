import { type Transaction } from "sequelize";

import { rethrowSequelizeError } from "../../common/errors/sequelize-error.mapper";
import { titleToSlug } from "../../common/utils/title-to-slug.util";
import { sequelize } from "../../database/sequelize.database";
import * as gameExternalService from "../../game-external/game-external.service";
import * as gamesServiceError from "../errors/games.service-error";
import { Game } from "../game.model";
import {
	type InheritedAssets,
	type SplitVariantInput
} from "../games.interface";
import { buildCatalogIncludes } from "../utils/build-catalog-includes.util";
import { extractCatalogAssets } from "../utils/extract-catalog-assets.util";
import { cloneCatalogAssetsToGames } from "./games-clone-assets.service";

export async function assertVariantConsistency(
	externalIds: readonly { source: string; externalId: string }[],
	variant: string | null,
	currentGameId: string | null
) {
	if (externalIds.length === 0) return;
	const siblings = await gameExternalService.findByExternalIds(externalIds);
	const otherSiblingIds = [
		...new Set(
			siblings
				.filter(sibling => sibling.gameId !== currentGameId)
				.map(sibling => sibling.gameId)
		)
	];
	if (otherSiblingIds.length === 0) return;
	if (!variant || variant.trim().length === 0)
		throw gamesServiceError.variantRequiredError();

	const siblingGames = await Game.findAll({
		where: { id: otherSiblingIds },
		attributes: ["id", "variant"]
	});
	const hasVariantById = new Map(
		siblingGames.map(game => [game.id, !!game.variant?.trim()])
	);
	if (otherSiblingIds.some(id => !hasVariantById.get(id)))
		throw gamesServiceError.variantRequiredError();
}

export async function splitGame(
	gameId: string,
	requestedVariants: readonly SplitVariantInput[]
) {
	const original = await loadGameForSplit(gameId);
	const variants = requestedVariants.map(variant => ({
		title: variant.title.trim(),
		variant: variant.variant.trim()
	}));
	assertSplitVariantsValid(variants);

	const inherited = extractInheritedAssets(original);
	const [firstVariant, ...restVariants] = variants as [
		SplitVariantInput,
		...SplitVariantInput[]
	];

	let resultingIds: string[];
	try {
		resultingIds = await sequelize.transaction(async transaction => {
			await applyFirstVariantToOriginal(
				original,
				firstVariant,
				transaction
			);
			const created = await createVariantsFromOriginal(
				original,
				restVariants,
				inherited,
				transaction
			);
			return [original.id, ...created.map(game => game.id)];
		});
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: gamesServiceError.uniqueConstraintError,
			validation: gamesServiceError.validationError
		});
	}

	return findVariantsInOrder(resultingIds);
}

async function loadGameForSplit(gameId: string) {
	const original = await Game.findOne({
		where: { id: gameId, isActive: true },
		include: [...buildCatalogIncludes(), { association: "GameExternals" }]
	});
	if (!original) throw gamesServiceError.notFoundError();
	return original;
}

function assertSplitVariantsValid(variants: readonly SplitVariantInput[]) {
	if (variants.length < 2) throw gamesServiceError.splitInvalidError();
	const codes = new Set<string>();
	const labels = new Set<string>();
	for (const variant of variants) {
		const code = titleToSlug(variant.title);
		if (!code || codes.has(code))
			throw gamesServiceError.splitInvalidError();
		codes.add(code);
		const label = variant.variant.toLowerCase();
		if (!label || labels.has(label))
			throw gamesServiceError.splitInvalidError();
		labels.add(label);
	}
}

function extractInheritedAssets(original: Game): InheritedAssets {
	return {
		...extractCatalogAssets(original),
		externals:
			original.GameExternals?.map(external => ({
				source: external.source,
				externalId: external.externalId
			})) ?? []
	};
}

async function applyFirstVariantToOriginal(
	original: Game,
	variant: SplitVariantInput,
	transaction: Transaction
) {
	await original.update(
		{
			title: variant.title,
			code: titleToSlug(variant.title),
			variant: variant.variant
		},
		{ transaction }
	);
}

async function createVariantsFromOriginal(
	original: Game,
	variants: readonly SplitVariantInput[],
	inherited: InheritedAssets,
	transaction: Transaction
) {
	const created = await Game.bulkCreate(
		variants.map(variant => ({
			title: variant.title,
			code: titleToSlug(variant.title),
			description: original.description,
			releaseAt: original.releaseAt,
			coverUrl: original.coverUrl,
			backgroundUrl: original.backgroundUrl,
			isDlc: original.isDlc,
			parentGameId: original.parentGameId,
			variant: variant.variant
		})),
		{ validate: true, transaction }
	);

	const createdIds = created.map(game => game.id);
	await cloneCatalogAssetsToGames(createdIds, inherited, transaction);
	await gameExternalService.createMany(
		createdIds.flatMap(gameId =>
			inherited.externals.map(external => ({ gameId, ...external }))
		),
		transaction
	);

	return created;
}

async function findVariantsInOrder(ids: string[]) {
	const games = await Game.findAll({
		where: { id: ids, isActive: true },
		include: [...buildCatalogIncludes(), { association: "Franchise" }]
	});
	const gameById = new Map(games.map(game => [game.id, game]));
	return ids.flatMap(id => gameById.get(id) ?? []);
}
