import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { type PlatinumEntry } from "../../../core/models";
import { PlatinumCoverCard } from "../../../shared/components/platinum-cover-card/platinum-cover-card";
import { ProfileSectionHeader } from "./profile-section-header";

const MOBILE_VISIBLE_PLATINUMS = 4;

@Component({
	selector: "app-profile-platinums",
	imports: [ProfileSectionHeader, PlatinumCoverCard],
	template: `
		<section aria-labelledby="platinums-heading">
			<app-profile-section-header
				heading="Platinums"
				headingId="platinums-heading"
				eyebrow="Trophy cabinet"
				[seeAllLink]="['/user', username(), 'platinums']"
			>
				<span
					class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums text-platinum bg-platinum/10 ring-1 ring-platinum/30"
				>
					<span aria-hidden="true" class="material-icons text-sm"
						>emoji_events</span
					>
					{{ total() }}
					<span class="sr-only">{{
						total() === 1 ? "platinum" : "platinums"
					}}</span>
				</span>
			</app-profile-section-header>
			<ol
				class="list-none m-0 p-0 grid grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4"
			>
				@for (
					platinum of platinums();
					track platinum.id;
					let index = $index
				) {
					<li [class.max-sm:hidden]="index >= mobileVisible">
						<app-platinum-cover-card [platinum]="platinum" />
					</li>
				}
			</ol>
		</section>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePlatinums {
	readonly username = input.required<string>();
	readonly platinums = input.required<PlatinumEntry[]>();
	readonly total = input.required<number>();

	protected readonly mobileVisible = MOBILE_VISIBLE_PLATINUMS;
}
