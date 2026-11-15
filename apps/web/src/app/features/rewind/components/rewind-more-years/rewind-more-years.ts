import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { catchError, of } from "rxjs";

import {
	type RewindLanguage,
	type RewindYears
} from "../../../../core/models/rewind.model";
import { ProfileSectionHeader } from "../../../public-profile/components/profile-section-header";
import { RewindService } from "../../rewind";
import { rewindCopy } from "../../rewind-copy";
import { RewindYearCard } from "../rewind-year-card/rewind-year-card";

@Component({
	selector: "app-rewind-more-years",
	imports: [ProfileSectionHeader, RewindYearCard],
	template: `
		@if (years().length > 0) {
			<section aria-labelledby="rewind-more-heading">
				<app-profile-section-header
					headingId="rewind-more-heading"
					[heading]="copy().moreRewinds"
					[seeAllLabel]="copy().seeAll"
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
								[premiumAccess]="premiumAccess()"
								[period]="period()"
								[language]="language()"
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
	readonly language = input<RewindLanguage>("en");

	protected readonly copy = computed(() => rewindCopy(this.language()).page);

	private readonly archive = rxResource({
		params: () => this.username(),
		stream: ({ params: username }) =>
			this.rewindService
				.getYears(username)
				.pipe(catchError(() => of(null)))
	});

	private readonly archiveData = computed<RewindYears | null>(() =>
		this.archive.hasValue() ? this.archive.value() : null
	);

	protected readonly premiumAccess = computed(
		() => this.archiveData()?.premiumAccess ?? null
	);
	protected readonly period = computed(
		() => this.archiveData()?.period ?? null
	);
	protected readonly years = computed(() =>
		(this.archiveData()?.years ?? []).filter(
			summary => summary.year !== this.currentYear()
		)
	);
}
