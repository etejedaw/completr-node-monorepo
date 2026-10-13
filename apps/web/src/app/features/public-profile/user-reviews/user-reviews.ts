import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { map } from "rxjs";

import { ReviewCard } from "../../../shared/components/review-card/review-card";
import { ProfileCollectionPage } from "../components/profile-collection-page";
import { injectPublicCollection } from "../services/public-collection";
import {
	PublicReviewsService,
	type ReviewEntry
} from "../services/public-reviews.service";

const UNKNOWN_GAME = { title: "" };

@Component({
	selector: "app-user-reviews",
	imports: [ProfileCollectionPage, ReviewCard],
	templateUrl: "./user-reviews.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserReviews {
	private readonly reviewsService = inject(PublicReviewsService);

	protected readonly collection = injectPublicCollection<ReviewEntry>(
		(username, pagination) =>
			this.reviewsService
				.getUserReviews(username, pagination)
				.pipe(
					map(page => ({ items: page.reviews, total: page.total }))
				),
		review =>
			review.game
				? {
						title: review.game.title,
						backgroundUrl: review.game.backgroundUrl ?? undefined
					}
				: UNKNOWN_GAME
	);
}
