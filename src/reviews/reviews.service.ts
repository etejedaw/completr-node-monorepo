import { Review } from "./review.model";
import { Game } from "../games/game.model";
import { User } from "../users/user.model";
import * as reviewsServiceError from "./errors/reviews.service-error";

export async function createReview(
	userId: string,
	gameId: string,
	dto: { content?: string; rating?: number }
) {
	const game = await Game.findByPk(gameId);
	if (!game) throw reviewsServiceError.gameNotFoundError();

	const existing = await Review.findOne({ where: { userId, gameId } });
	if (existing) throw reviewsServiceError.alreadyExistsError();

	return Review.create({ userId, gameId, content: dto.content, rating: dto.rating });
}

export async function findReviewsByGameId(gameId: string) {
	return Review.findAll({
		where: { gameId },
		include: [
			{
				model: User,
				attributes: ["id", "username", "name", "avatarUrl"]
			}
		],
		order: [["createdAt", "DESC"]]
	});
}

export async function findReviewsByUserId(userId: string) {
	return Review.findAll({
		where: { userId },
		include: [{ model: Game }],
		order: [["createdAt", "DESC"]]
	});
}

export async function findReviewByUserAndGame(userId: string, gameId: string) {
	return Review.findOne({ where: { userId, gameId } });
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
