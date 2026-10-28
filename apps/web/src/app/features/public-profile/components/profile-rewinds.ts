import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input
} from "@angular/core";

import { type RewindYearSummary } from "../../../core/models/rewind.model";
import { ViewportService } from "../../../core/services/viewport";
import { RewindYearCard } from "../../rewind/components/rewind-year-card/rewind-year-card";
import { ProfileSectionHeader } from "./profile-section-header";

const PROFILE_REWIND_LIMIT = 4;

@Component({
	selector: "app-profile-rewinds",
	imports: [ProfileSectionHeader, RewindYearCard],
	template: `
		@if (years().length > 0) {
			<section aria-labelledby="profile-rewinds-heading">
				<app-profile-section-header
					heading="Rewind"
					headingId="profile-rewinds-heading"
					eyebrow="Year in review"
					[seeAllLink]="
						years().length > limit
							? ['/user', username(), 'rewind']
							: null
					"
				/>
				<ul
					class="list-none m-0 p-0"
					[class]="
						isMobile()
							? 'bleed bleed-inner bleed-scroll-snap flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
							: 'grid grid-cols-4 gap-4'
					"
				>
					@for (summary of visibleYears(); track summary.year) {
						<li
							[class]="
								isMobile()
									? 'w-[11rem] shrink-0 snap-start'
									: ''
							"
						>
							<app-rewind-year-card
								[username]="username()"
								[summary]="summary"
							/>
						</li>
					}
				</ul>
			</section>
		}
	`,
	host: { class: "block empty:hidden" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileRewinds {
	readonly username = input.required<string>();
	readonly years = input.required<RewindYearSummary[]>();

	protected readonly isMobile = inject(ViewportService).isMobile;
	protected readonly limit = PROFILE_REWIND_LIMIT;
	protected readonly visibleYears = computed(() =>
		this.years().slice(0, PROFILE_REWIND_LIMIT)
	);
}
