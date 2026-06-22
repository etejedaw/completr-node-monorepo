import { Transaction } from "sequelize";
import { sequelize } from "../../database/sequelize.database";
import { rethrowSequelizeError } from "../../common/errors/sequelize-error.mapper";
import { Game } from "../game.model";
import { CompilationItem } from "../../compilation-items/compilation-item.model";
import { SetCompilationItemInput } from "../games.interface";
import * as gamesServiceError from "../errors/games.service-error";
import * as gamePlatformsService from "../../game-platform/game-platform.service";
import * as gameGenresService from "../../game-genre/game-genre.service";
import * as gameScoresService from "../../game-scores/game-scores.service";
import * as gameTimesService from "../../game-times/game-times.service";
import { TimeSource } from "../../game-times/game-time.model";
import { titleToSlug } from "../../common/utils/title-to-slug.util";

export async function setCompilationItems(
	parentGameId: string,
	items: readonly SetCompilationItemInput[]
) {
	const parent = await loadCompilationParent(parentGameId);
	assertCompilationItemsValid(parentGameId, items);

	const linkedIds = items
		.filter(i => i.mode === "link")
		.map(i => (i as { gameId: string }).gameId);
	await assertLinkedGamesExist(linkedIds);

	const inherited = extractParentAssets(parent);

	const transaction = await sequelize.transaction();
	try {
		await CompilationItem.destroy({
			where: { parentGameId },
			transaction
		});

		const resolvedChildIds: string[] = [];
		for (const item of items) {
			if (item.mode === "link") {
				resolvedChildIds.push(item.gameId);
			} else {
				const child = await createCompilationChild(
					parent,
					item.title,
					inherited,
					transaction
				);
				resolvedChildIds.push(child.id);
			}
		}

		if (new Set(resolvedChildIds).size !== resolvedChildIds.length) {
			throw gamesServiceError.compilationInvalidError();
		}

		for (let i = 0; i < resolvedChildIds.length; i++) {
			await CompilationItem.create(
				{
					parentGameId,
					childGameId: resolvedChildIds[i],
					position: i
				},
				{ transaction }
			);
		}

		await parent.update({ isCompilation: true }, { transaction });

		await transaction.commit();

		return await findCompilationItemsByParent(parentGameId);
	} catch (error) {
		await transaction.rollback();
		rethrowSequelizeError(error, {
			unique: gamesServiceError.uniqueConstraintError,
			validation: gamesServiceError.validationError
		});
	}
}

export async function clearCompilation(parentGameId: string) {
	const parent = await Game.findOne({
		where: { id: parentGameId, isActive: true }
	});
	if (!parent) throw gamesServiceError.notFoundError();

	const transaction = await sequelize.transaction();
	try {
		await CompilationItem.destroy({
			where: { parentGameId },
			transaction
		});
		await parent.update({ isCompilation: false }, { transaction });
		await transaction.commit();
	} catch (error) {
		await transaction.rollback();
		throw error;
	}
}

export async function findCompilationItemsByParent(parentGameId: string) {
	return CompilationItem.findAll({
		where: { parentGameId },
		include: [
			{
				association: "ChildGame",
				include: [
					{ association: "Platforms" },
					{ association: "GameScores" },
					{ association: "GameTimes" },
					{ association: "Genres" }
				]
			}
		],
		order: [["position", "ASC"]]
	});
}

export async function findCompilationParentsForChild(childGameId: string) {
	return CompilationItem.findAll({
		where: { childGameId },
		include: [
			{
				association: "ParentGame",
				where: { isActive: true },
				required: true
			}
		],
		order: [["createdAt", "ASC"]]
	});
}

async function loadCompilationParent(parentGameId: string) {
	const parent = await Game.findOne({
		where: { id: parentGameId, isActive: true },
		include: [
			{ association: "Platforms" },
			{ association: "Genres" },
			{ association: "GameScores" },
			{ association: "GameTimes" }
		]
	});
	if (!parent) throw gamesServiceError.notFoundError();
	return parent;
}

function assertCompilationItemsValid(
	parentGameId: string,
	items: readonly SetCompilationItemInput[]
) {
	for (const item of items) {
		if (item.mode === "link" && item.gameId === parentGameId) {
			throw gamesServiceError.compilationInvalidError();
		}
	}

	const linkedIds = items
		.filter(i => i.mode === "link")
		.map(i => (i as { gameId: string }).gameId);
	if (new Set(linkedIds).size !== linkedIds.length) {
		throw gamesServiceError.compilationInvalidError();
	}

	const createdSlugs = items
		.filter(i => i.mode === "create")
		.map(i => titleToSlug((i as { title: string }).title));
	if (createdSlugs.some(s => !s)) {
		throw gamesServiceError.compilationInvalidError();
	}
	if (new Set(createdSlugs).size !== createdSlugs.length) {
		throw gamesServiceError.compilationInvalidError();
	}
}

async function assertLinkedGamesExist(linkedIds: readonly string[]) {
	if (linkedIds.length === 0) return;
	const found = await Game.findAll({
		where: { id: linkedIds as string[], isActive: true }
	});
	if (found.length !== linkedIds.length) {
		throw gamesServiceError.notFoundError();
	}
}

interface InheritedParentAssets {
	platformIds: string[];
	genreIds: string[];
	scores: { source: string; score: number }[];
	times: { source: TimeSource; duration: number }[];
}

function extractParentAssets(parent: Game): InheritedParentAssets {
	return {
		platformIds: parent.Platforms?.map(p => p.id) ?? [],
		genreIds: parent.Genres?.map(g => g.id) ?? [],
		scores:
			parent.GameScores?.map(s => ({
				source: s.source,
				score: s.score
			})) ?? [],
		times:
			parent.GameTimes?.map(t => ({
				source: t.source,
				duration: t.duration
			})) ?? []
	};
}

async function createCompilationChild(
	parent: Game,
	title: string,
	inherited: InheritedParentAssets,
	transaction: Transaction
) {
	const child = await Game.create(
		{
			title,
			code: titleToSlug(title),
			description: parent.description,
			releaseAt: parent.releaseAt,
			coverUrl: parent.coverUrl,
			backgroundUrl: parent.backgroundUrl,
			isDlc: false,
			isCompilation: false
		},
		{ transaction }
	);
	if (inherited.platformIds.length > 0) {
		await gamePlatformsService.linkGameToPlatforms(
			child.id,
			inherited.platformIds,
			transaction
		);
	}
	if (inherited.genreIds.length > 0) {
		await gameGenresService.linkGameToGenres(
			child.id,
			inherited.genreIds,
			transaction
		);
	}
	for (const s of inherited.scores) {
		await gameScoresService.createGameScore(
			child.id,
			s.source,
			s.score,
			transaction
		);
	}
	for (const t of inherited.times) {
		await gameTimesService.createGameTime(
			child.id,
			t.source,
			t.duration,
			transaction
		);
	}
	return child;
}
