import { Review } from "./review.model";

export function reviewSerializer(review: Review) {
	return {
		id: review.id,
		content: review.content,
		rating: review.rating,
		user: review.User
			? {
					id: review.User.id,
					username: review.User.username,
					name: review.User.name,
					avatarUrl: review.User.avatarUrl
				}
			: null,
		createdAt: review.createdAt,
		updatedAt: review.updatedAt
	};
}
