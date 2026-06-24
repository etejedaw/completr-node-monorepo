import { fn, col, Op, literal } from "sequelize";
import { Review } from "./review.model";
import { Game } from "../games/game.model";
import { User } from "../users/user.model";
import { USER_PUBLIC_ATTRS } from "../users/constants/user-attrs.constants";
import * as gamesService from "../games/games.service";
import * as reviewsServiceError from "./errors/reviews.service-error";
import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";

const REVIEW_GAME_ATTRS = ["id", "code", "title"];

const hasContent = literal(`"content" IS NOT NULL AND btrim("content") <> ''`);
const hasContentOrRating = literal(
	`(("content" IS NOT NULL AND btrim("content") <> '') OR "rating" IS NOT NULL)`
);

export async function createReview(
	userId: string,
	gameId: string,
	dto: { content?: string; rating?: number }
) {
	const game = await gamesService.findGameById(gameId);
	if (!game) throw reviewsServiceError.gameNotFoundError();

	const existing = await Review.findOne({ where: { userId, gameId } });
	if (existing) throw reviewsServiceError.alreadyExistsError();

	try {
		return await Review.create({
			userId,
			gameId,
			content: dto.content,
			rating: dto.rating
		});
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: () => reviewsServiceError.alreadyExistsError()
		});
	}
}

export async function findReviewsByGameId(gameId: string) {
	return Review.findAll({
		where: { gameId },
		include: [
			{
				model: User,
				attributes: USER_PUBLIC_ATTRS
			}
		],
		order: [["createdAt", "DESC"]]
	});
}

export async function findReviewsByUserId(userId: string) {
	return Review.findAll({
		where: { userId, [Op.and]: hasContentOrRating },
		include: [{ model: Game, attributes: REVIEW_GAME_ATTRS }],
		order: [["createdAt", "DESC"]]
	});
}

export async function findReviewsByUserIdPaginated(
	userId: string,
	options: { limit?: number; offset?: number } = {}
) {
	const { limit = 50, offset = 0 } = options;
	return Review.findAndCountAll({
		where: { userId, [Op.and]: hasContentOrRating },
		include: [{ model: Game, attributes: REVIEW_GAME_ATTRS }],
		order: [["createdAt", "DESC"]],
		limit,
		offset,
		distinct: true
	});
}

export async function findReviewByUserAndGame(userId: string, gameId: string) {
	return Review.findOne({ where: { userId, gameId } });
}

export async function findReviewContentByUserAndGameIds(
	userId: string,
	gameIds: string[]
) {
	const rows = (await Review.findAll({
		where: {
			userId,
			gameId: { [Op.in]: gameIds }
		},
		attributes: ["gameId", "content", "rating"],
		raw: true
	})) as unknown as {
		gameId: string;
		content: string | null;
		rating: number | null;
	}[];
	return new Map(
		rows.map(r => [r.gameId, { content: r.content, rating: r.rating }])
	);
}

export async function findAggregatedRatingsByGame() {
	return (await Review.findAll({
		attributes: [
			"gameId",
			[fn("AVG", col("rating")), "avgRating"],
			[fn("COUNT", col("rating")), "reviewCount"]
		],
		where: { rating: { [Op.not]: null } },
		group: ["gameId"],
		raw: true
	})) as unknown as {
		gameId: string;
		avgRating: number;
		reviewCount: number;
	}[];
}

export async function findLatestReviewedGameIds(limit = 16) {
	const rows = (await Review.findAll({
		where: { [Op.and]: hasContent },
		attributes: ["gameId", [fn("MAX", col("createdAt")), "lastReviewedAt"]],
		group: ["gameId"],
		order: [[fn("MAX", col("createdAt")), "DESC"]],
		limit,
		raw: true
	})) as unknown as { gameId: string }[];

	return rows.map(r => r.gameId);
}

export async function updateReview(
	id: string,
	userId: string,
	dto: { content?: string | null; rating?: number | null }
) {
	const review = await Review.findByPk(id);
	if (!review) throw reviewsServiceError.notFoundError();
	if (review.userId !== userId) throw reviewsServiceError.forbiddenError();

	return review.update(dto);
}

export async function deleteReview(id: string, userId: string) {
	const review = await Review.findByPk(id);
	if (!review) throw reviewsServiceError.notFoundError();
	if (review.userId !== userId) throw reviewsServiceError.forbiddenError();

	await review.destroy();
}
