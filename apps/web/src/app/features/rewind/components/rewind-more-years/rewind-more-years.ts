import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { catchError, map, of } from "rxjs";

import { ProfileSectionHeader } from "../../../public-profile/components/profile-section-header";
import { RewindService } from "../../rewind";
import { RewindYearCard } from "../rewind-year-card/rewind-year-card";

@Component({
	selector: "app-rewind-more-years",
	imports: [ProfileSectionHeader, RewindYearCard],
	template: `
		@if (years().length > 0) {
			<section aria-labelledby="rewind-more-heading">
				<app-profile-section-header
					heading="More Rewinds"
					headingId="rewind-more-heading"
					[seeAllLink]="['/user', username(), 'rewind']"
				/>
				<ul
					class="list-none m-0 p-0 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
				>
					@for (summary of years(); track summary.year) {
						<li>
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
export class RewindMoreYears {
	private readonly rewindService = inject(RewindService);

	readonly username = input.required<string>();
	readonly currentYear = input.required<number>();

	private readonly archive = rxResource({
		params: () => this.username(),
		stream: ({ params: username }) =>
			this.rewindService.getYears(username).pipe(
				map(result => result.years),
				catchError(() => of([]))
			)
	});

	protected readonly years = computed(() =>
		(this.archive.hasValue() ? this.archive.value() : []).filter(
			summary => summary.year !== this.currentYear()
		)
	);
}
