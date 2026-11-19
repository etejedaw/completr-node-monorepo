import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";

import { ProfileSectionHeader } from "../../../shared/components/profile-section-header/profile-section-header";
import { TagIcon } from "../../../shared/components/tag-icon/tag-icon";
import { type PublicFavoriteTag } from "../public-profile.model";

@Component({
	selector: "app-profile-favorite-tags",
	imports: [ProfileSectionHeader, RouterLink, TagIcon],
	template: `
		<section aria-labelledby="favorite-tags-heading">
			<app-profile-section-header
				heading="Favorite tags"
				headingId="favorite-tags-heading"
				eyebrow="Tags"
			/>
			<ol class="list-none m-0 p-0 flex flex-wrap gap-2 sm:gap-3">
				@for (favorite of tags(); track favorite.tag) {
					<li class="min-w-0 max-w-full sm:max-w-[18rem]">
						<a
							class="group flex flex-col justify-center gap-0.5 min-w-0 min-h-[44px] px-3.5 py-2 rounded-card border border-line bg-surface no-underline transition hover:border-line-hover hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
							[routerLink]="['/tags', favorite.tag]"
						>
							<span
								class="inline-flex items-center gap-1.5 min-w-0 text-sm font-semibold text-fg group-hover:text-brand"
							>
								<app-tag-icon
									class="text-base"
									[icon]="favorite.icon"
									[color]="favorite.color"
								/>
								<span class="truncate">{{ favorite.tag }}</span>
							</span>
						</a>
					</li>
				}
			</ol>
		</section>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileFavoriteTags {
	readonly tags = input.required<readonly PublicFavoriteTag[]>();
}
