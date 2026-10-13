import { type Review } from "./review.model";

export function reviewSerializer(
	review: Review,
	playthroughDuration: number | null = null
) {
	return {
		id: review.id,
		content: review.content,
		rating: review.rating,
		playthroughDuration,
		user: review.User
			? {
					id: review.User.id,
					username: review.User.username,
					name: review.User.name,
					avatarUrl: review.User.avatarUrl,
					role: review.User.role
				}
			: null,
		createdAt: review.createdAt,
		updatedAt: review.updatedAt
	};
}

export function userReviewSerializer(
	review: Review,
	playthroughDuration: number | null = null
) {
	return {
		id: review.id,
		content: review.content,
		rating: review.rating,
		playthroughDuration,
		game: review.Game
			? {
					id: review.Game.id,
					code: review.Game.code,
					title: review.Game.title,
					coverUrl: review.Game.coverUrl ?? null,
					backgroundUrl: review.Game.backgroundUrl ?? null
				}
			: null,
		createdAt: review.createdAt,
		updatedAt: review.updatedAt
	};
}
