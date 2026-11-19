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
					<li class="min-w-0 max-w-full">
						<a
							class="inline-flex items-center gap-2 min-w-0 max-w-full min-h-[44px] pl-3 pr-4 rounded-full border border-line bg-surface text-[0.9375rem] font-medium text-fg-secondary no-underline transition-colors hover:border-brand/50 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
							[routerLink]="['/tags', favorite.tag]"
						>
							<app-tag-icon
								class="shrink-0 !text-[1.25rem]"
								[icon]="favorite.icon"
								[color]="favorite.color"
							/>
							<span class="truncate">{{ favorite.tag }}</span>
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
