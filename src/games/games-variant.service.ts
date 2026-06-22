import { Transaction } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { Game } from "./game.model";
import { GameExternal } from "../game-external/game-external.model";
import { SplitVariantInput } from "./games.interface";
import * as gamesServiceError from "./errors/games.service-error";
import * as gamePlatformsService from "../game-platform/game-platform.service";
import * as gameGenresService from "../game-genre/game-genre.service";
import * as gameScoresService from "../game-scores/game-scores.service";
import * as gameTimesService from "../game-times/game-times.service";
import { TimeSource } from "../game-times/game-time.model";
import { titleToSlug } from "../common/utils/title-to-slug.util";
import { findGameById } from "./games-search.service";

export async function assertVariantConsistency(
	externalIds: readonly { source: string; externalId: string }[],
	variant: string | null,
	currentGameId: string | null
) {
	for (const { source, externalId } of externalIds) {
		const siblings = await GameExternal.findAll({
			where: { source, externalId },
			include: [{ association: "Game" }]
		});
		const otherSiblings = siblings.filter(s => s.gameId !== currentGameId);
		if (otherSiblings.length === 0) continue;
		if (!variant || variant.trim().length === 0) {
			throw gamesServiceError.variantRequiredError();
		}
		for (const sibling of otherSiblings) {
			const siblingGame = await Game.findByPk(sibling.gameId);
			if (
				!siblingGame?.variant ||
				siblingGame.variant.trim().length === 0
			) {
				throw gamesServiceError.variantRequiredError();
			}
		}
	}
}

export async function splitGame(
	gameId: string,
	variants: readonly SplitVariantInput[]
) {
	const original = await loadGameForSplit(gameId);
	assertSplitVariantsValid(variants);

	const inherited = extractInheritedAssets(original);
	const [firstVariant, ...restVariants] = variants as [
		SplitVariantInput,
		...SplitVariantInput[]
	];

	const transaction = await sequelize.transaction();
	try {
		await applyFirstVariantToOriginal(original, firstVariant, transaction);
		const createdIds: string[] = [original.id];

		for (const variant of restVariants) {
			const created = await createVariantFromOriginal(
				original,
				variant,
				inherited,
				transaction
			);
			createdIds.push(created.id);
		}

		await transaction.commit();

		const refreshed = await Promise.all(
			createdIds.map(id => findGameById(id))
		);
		return refreshed.filter((g): g is Game => g !== null);
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
	for (const v of variants) {
		const code = titleToSlug(v.title);
		if (!code) throw gamesServiceError.splitInvalidError();
		if (codes.has(code)) throw gamesServiceError.splitInvalidError();
		codes.add(code);
	}
}

interface InheritedAssets {
	platformIds: string[];
	genreIds: string[];
	scores: { source: string; score: number }[];
	times: { source: TimeSource; duration: number }[];
	externals: { source: string; externalId: string }[];
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

async function createVariantFromOriginal(
	original: Game,
	variant: SplitVariantInput,
	inherited: InheritedAssets,
	transaction: Transaction
) {
	const newGame = await Game.create(
		{
			title: variant.title,
			code: titleToSlug(variant.title),
			description: original.description,
			releaseAt: original.releaseAt,
			coverUrl: original.coverUrl,
			backgroundUrl: original.backgroundUrl,
			isDlc: original.isDlc,
			parentGameId: original.parentGameId,
			variant: variant.variant
		},
		{ transaction }
	);

	if (inherited.platformIds.length > 0) {
		await gamePlatformsService.linkGameToPlatforms(
			newGame.id,
			inherited.platformIds,
			transaction
		);
	}
	if (inherited.genreIds.length > 0) {
		await gameGenresService.linkGameToGenres(
			newGame.id,
			inherited.genreIds,
			transaction
		);
	}
	for (const s of inherited.scores) {
		await gameScoresService.createGameScore(
			newGame.id,
			s.source,
			s.score,
			transaction
		);
	}
	for (const t of inherited.times) {
		await gameTimesService.createGameTime(
			newGame.id,
			t.source,
			t.duration,
			transaction
		);
	}
	for (const e of inherited.externals) {
		await GameExternal.create(
			{
				gameId: newGame.id,
				source: e.source,
				externalId: e.externalId
			},
			{ transaction }
		);
	}

	return newGame;
}
