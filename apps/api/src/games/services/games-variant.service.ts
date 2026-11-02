import { Op, type Transaction } from "sequelize";

import { rethrowSequelizeError } from "../../common/errors/sequelize-error.mapper";
import { titleToSlug } from "../../common/utils/title-to-slug.util";
import { sequelize } from "../../database/sequelize.database";
import { GameExternal } from "../../game-external/game-external.model";
import * as gameGenresService from "../../game-genre/game-genre.service";
import * as gamePlatformsService from "../../game-platform/game-platform.service";
import * as gameScoresService from "../../game-scores/game-scores.service";
import * as gameTimesService from "../../game-times/game-times.service";
import * as gamesServiceError from "../errors/games.service-error";
import { Game } from "../game.model";
import {
	type InheritedAssets,
	type SplitVariantInput
} from "../games.interface";

export async function assertVariantConsistency(
	externalIds: readonly { source: string; externalId: string }[],
	variant: string | null,
	currentGameId: string | null
) {
	if (externalIds.length === 0) return;
	const siblings = await GameExternal.findAll({
		where: {
			[Op.or]: externalIds.map(({ source, externalId }) => ({
				source,
				externalId
			}))
		}
	});
	const otherSiblingIds = [
		...new Set(
			siblings
				.filter(sibling => sibling.gameId !== currentGameId)
				.map(sibling => sibling.gameId)
		)
	];
	if (otherSiblingIds.length === 0) return;
	if (!variant || variant.trim().length === 0) {
		throw gamesServiceError.variantRequiredError();
	}
	const siblingGames = await Game.findAll({
		where: { id: otherSiblingIds },
		attributes: ["id", "variant"]
	});
	const hasVariantById = new Map(
		siblingGames.map(game => [game.id, !!game.variant?.trim()])
	);
	if (otherSiblingIds.some(id => !hasVariantById.get(id))) {
		throw gamesServiceError.variantRequiredError();
	}
}

export async function splitGame(
	gameId: string,
	requestedVariants: readonly SplitVariantInput[]
) {
	const original = await loadGameForSplit(gameId);
	const variants = requestedVariants.map(v => ({
		title: v.title.trim(),
		variant: v.variant.trim()
	}));
	assertSplitVariantsValid(variants);

	const inherited = extractInheritedAssets(original);
	const [firstVariant, ...restVariants] = variants as [
		SplitVariantInput,
		...SplitVariantInput[]
	];

	const transaction = await sequelize.transaction();
	try {
		await applyFirstVariantToOriginal(original, firstVariant, transaction);
		const created = await createVariantsFromOriginal(
			original,
			restVariants,
			inherited,
			transaction
		);
		const createdIds = [original.id, ...created.map(game => game.id)];

		await transaction.commit();

		return await findVariantsInOrder(createdIds);
	} catch (error) {
		await transaction.rollback();
		rethrowSequelizeError(error, {
			unique: gamesServiceError.uniqueConstraintError,
			validation: gamesServiceError.validationError
		});
	}
}

async function loadGameForSplit(gameId: string) {
	const original = await Game.findOne({
		where: { id: gameId, isActive: true },
		include: [
			{ association: "Platforms" },
			{ association: "Genres" },
			{ association: "GameScores" },
			{ association: "GameTimes" },
			{ association: "GameExternals" }
		]
	});
	if (!original) throw gamesServiceError.notFoundError();
	return original;
}

function assertSplitVariantsValid(variants: readonly SplitVariantInput[]) {
	if (variants.length < 2) throw gamesServiceError.splitInvalidError();
	const codes = new Set<string>();
	const labels = new Set<string>();
	for (const v of variants) {
		const code = titleToSlug(v.title);
		if (!code) throw gamesServiceError.splitInvalidError();
		if (codes.has(code)) throw gamesServiceError.splitInvalidError();
		codes.add(code);
		const label = v.variant.toLowerCase();
		if (!label || labels.has(label))
			throw gamesServiceError.splitInvalidError();
		labels.add(label);
	}
}

function extractInheritedAssets(original: Game): InheritedAssets {
	return {
		platformIds: original.Platforms.map(p => p.id),
		genreIds: original.Genres.map(g => g.id),
		scores: original.GameScores.map(s => ({
			source: s.source,
			score: s.score
		})),
		times: original.GameTimes.map(t => ({
			source: t.source,
			duration: t.duration
		})),
		externals: original.GameExternals.map(e => ({
			source: e.source,
			externalId: e.externalId
		}))
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
	await gamePlatformsService.linkGamesToPlatforms(
		createdIds,
		inherited.platformIds,
		transaction
	);
	await gameGenresService.linkGamesToGenres(
		createdIds,
		inherited.genreIds,
		transaction
	);

	await gameScoresService.createGameScores(
		created.flatMap(({ id }) =>
			inherited.scores.map(score => ({ gameId: id, ...score }))
		),
		transaction
	);
	await gameTimesService.createGameTimes(
		created.flatMap(({ id }) =>
			inherited.times.map(time => ({ gameId: id, ...time }))
		),
		transaction
	);
	if (inherited.externals.length > 0) {
		await GameExternal.bulkCreate(
			created.flatMap(({ id }) =>
				inherited.externals.map(external => ({
					gameId: id,
					...external
				}))
			),
			{ validate: true, transaction }
		);
	}

	return created;
}

async function findVariantsInOrder(ids: string[]) {
	const games = await Game.findAll({
		where: { id: ids, isActive: true },
		include: [
			{ association: "Platforms" },
			{ association: "Genres" },
			{ association: "GameScores" },
			{ association: "GameTimes" },
			{ association: "Franchise" }
		]
	});
	const gameById = new Map(games.map(game => [game.id, game]));
	return ids.flatMap(id => gameById.get(id) ?? []);
}
