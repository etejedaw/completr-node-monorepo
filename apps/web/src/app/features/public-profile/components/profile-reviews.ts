import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";

import { StarRating } from "../../../shared/components/star-rating/star-rating";
import { type ReviewEntry } from "../services/public-reviews.service";
import { ProfileSectionHeader } from "./profile-section-header";

@Component({
	selector: "app-profile-reviews",
	imports: [RouterLink, ProfileSectionHeader, StarRating],
	template: `
		@if (reviews().length > 0) {
			<section aria-labelledby="profile-reviews-heading">
				<app-profile-section-header
					heading="Latest reviews"
					headingId="profile-reviews-heading"
					eyebrow="In their words"
					[seeAllLink]="['/user', username(), 'reviews']"
					[seeAllLabel]="'All ' + total()"
				/>
				<ul class="list-none m-0 p-0 grid gap-3 md:grid-cols-2">
					@for (review of reviews(); track review.id) {
						<li
							class="flex flex-col gap-2 p-4 rounded-card border border-line bg-surface"
						>
							<div class="flex items-start justify-between gap-3">
								@if (review.game) {
									<a
										class="font-display text-base font-semibold text-fg no-underline leading-tight hover:text-brand"
										[routerLink]="[
											'/games',
											review.game.code
										]"
										>{{ review.game.title }}</a
									>
								}
								@if (review.rating) {
									<app-star-rating
										class="shrink-0"
										[value]="review.rating"
										[readonly]="true"
										size="sm"
									/>
								}
							</div>
							@if (review.content) {
								<p
									class="m-0 pl-3 border-l-2 border-brand/40 text-sm text-fg-secondary leading-relaxed line-clamp-4"
								>
									{{ review.content }}
								</p>
							}
							@if (review.playthroughDuration) {
								<span class="mt-auto text-xs text-fg-muted"
									>After {{ review.playthroughDuration }}h of
									play</span
								>
							}
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
