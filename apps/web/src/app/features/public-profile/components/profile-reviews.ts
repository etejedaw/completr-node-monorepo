import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { ReviewCard } from "../../../shared/components/review-card/review-card";
import { type ReviewEntry } from "../services/public-reviews.service";
import { ProfileSectionHeader } from "./profile-section-header";

@Component({
	selector: "app-profile-reviews",
	imports: [ProfileSectionHeader, ReviewCard],
	template: `
		@if (reviews().length > 0) {
			<section aria-labelledby="profile-reviews-heading">
				<app-profile-section-header
					heading="Reviews"
					headingId="profile-reviews-heading"
					eyebrow="In their words"
					[seeAllLink]="['/user', username(), 'reviews']"
					[seeAllLabel]="'All ' + total()"
				/>
				<ul class="list-none m-0 p-0 grid gap-3 md:grid-cols-2">
					@for (review of reviews(); track review.id) {
						<li>
							<app-review-card [review]="review" variant="card" />
						</li>
					}
				</ul>
			</section>
		}
	`,
	host: { class: "block empty:hidden" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileReviews {
	readonly username = input.required<string>();
	readonly reviews = input.required<ReviewEntry[]>();
	readonly total = input(0);
}
