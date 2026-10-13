import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { type Params, RouterLink } from "@angular/router";

@Component({
	selector: "app-profile-section-header",
	imports: [RouterLink],
	template: `
		<header
			class="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 mb-4"
		>
			<div class="min-w-0">
				@if (eyebrow()) {
					<span
						class="block text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-brand"
						>{{ eyebrow() }}</span
					>
				}
				<h2
					class="m-0 mt-1 font-display text-xl sm:text-2xl font-bold tracking-tight"
					[id]="headingId()"
				>
					{{ heading() }}
				</h2>
			</div>
			<div class="flex items-center gap-3">
				<ng-content />
				@if (seeAllLink(); as link) {
					<a
						class="tap-area inline-flex items-center gap-0.5 text-sm font-medium text-fg-secondary no-underline hover:text-brand"
						[routerLink]="link"
						[queryParams]="seeAllQueryParams()"
					>
						{{ seeAllLabel() }}
						<span aria-hidden="true" class="material-icons text-lg"
							>chevron_right</span
						>
					</a>
				}
			</div>
		</header>
	`,
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileSectionHeader {
	readonly heading = input.required<string>();
	readonly headingId = input.required<string>();
	readonly eyebrow = input<string | null>(null);
	readonly seeAllLink = input<unknown[] | null>(null);
	readonly seeAllQueryParams = input<Params | null>(null);
	readonly seeAllLabel = input("See all");
}
