import { Request, Response } from "express";
import { RequestUser } from "../common/interfaces/request-user.interface";
import { GameIdParam } from "../games/schemas/game-id-params.schema";
import { CreateReviewDto } from "./schemas/create-review.schema";
import { UpdateReviewDto } from "./schemas/update-review.schema";
import * as reviewsService from "./reviews.service";
import * as reviewsServiceError from "./errors/reviews.service-error";
import * as activityService from "../activity/activity.service";
import * as backlogService from "../backlog/backlog.service";
import { reviewSerializer } from "./reviews.serializer";

export async function postReview(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as GameIdParam;
	const body = request.locals.body as CreateReviewDto;

	const review = await reviewsService.createReview(user.id, params.id, body);

	activityService.record(user.id, "game_reviewed", params.id);

	const data = { review: reviewSerializer(review.get({ plain: true })) };
	return response.status(201).json({ data });
}

export async function getReviews(request: Request, response: Response) {
	const params = request.locals.params as GameIdParam;

	const reviews = await reviewsService.findReviewsByGameId(params.id);
	const reviewsPlain = reviews.map(r => r.get({ plain: true }));

	const pairs = reviewsPlain
		.filter(r => r.User)
		.map(r => ({ userId: r.User.id, gameId: params.id }));
	const durationMap =
		await backlogService.findLatestCompletedDurations(pairs);

	const data = {
		reviews: reviewsPlain.map(r =>
			reviewSerializer(
				r,
				r.User
					? (durationMap.get(`${r.User.id}:${params.id}`) ?? null)
					: null
			)
		)
	};
	return response.status(200).json({ data });
}

export async function patchReview(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as GameIdParam;
	const body = request.locals.body as UpdateReviewDto;

	const existing = await reviewsService.findReviewByUserAndGame(
		user.id,
		params.id
	);
	if (!existing) throw reviewsServiceError.notFoundError();

	const review = await reviewsService.updateReview(
		existing.id,
		user.id,
		body
	);

	const data = { review: reviewSerializer(review.get({ plain: true })) };
	return response.status(200).json({ data });
}

export async function deleteReview(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as GameIdParam;

	const existing = await reviewsService.findReviewByUserAndGame(
		user.id,
		params.id
	);
	if (!existing) throw reviewsServiceError.notFoundError();

	await reviewsService.deleteReview(existing.id, user.id);
	return response.sendStatus(204);
}
