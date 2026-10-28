import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { UiButton } from "../../../shared/ui";
import { type TrackedFranchise } from "../../franchises/franchises";
import { ProfileSectionHeader } from "./profile-section-header";

const COLLAPSED_SAGA_COUNT = 6;

@Component({
	selector: "app-profile-sagas",
	imports: [RouterLink, ProfileSectionHeader, UiButton],
	template: `
		@if (sagas().length > 0) {
			<section aria-labelledby="profile-sagas-heading">
				<app-profile-section-header
					heading="Sagas"
					headingId="profile-sagas-heading"
					eyebrow="Franchises"
				/>
				<ul
					class="list-none m-0 p-0 grid gap-x-8 sm:grid-cols-2 xl:grid-cols-3 border-t border-line"
				>
					@for (saga of visibleSagas(); track saga.franchise.id) {
						<li class="border-b border-line">
							<a
								class="group flex items-center gap-3 py-3 min-h-[44px] no-underline"
								[routerLink]="[
									'/franchises',
									saga.franchise.code
								]"
							>
								<span
									aria-hidden="true"
									class="shrink-0 w-10 h-10 inline-flex items-center justify-center rounded-card bg-brand-subtle text-brand"
								>
									<span class="material-icons text-xl"
										>collections_bookmark</span
									>
								</span>
								<span
									class="flex-1 min-w-0 text-sm font-medium text-fg truncate group-hover:text-brand"
									>{{ saga.franchise.name }}</span
								>
								<span
									class="shrink-0 text-xs text-fg-muted tabular-nums"
									>{{ saga.gameCount }}
									{{
										saga.gameCount === 1 ? "game" : "games"
									}}</span
								>
							</a>
						</li>
					}
				</ul>
				@if (sagas().length > collapsedCount) {
					<button
						uiButton
						variant="ghost"
						class="mt-3 tap:min-h-[44px]"
						[attr.aria-expanded]="expanded()"
						(click)="expanded.set(!expanded())"
					>
						{{
							expanded()
								? "Show fewer"
								: "Show all " + sagas().length + " sagas"
						}}
						<span
							aria-hidden="true"
							class="material-icons text-lg"
							>{{
								expanded() ? "expand_less" : "expand_more"
							}}</span
						>
					</button>
				}
			</section>
		}
	`,
	host: { class: "block empty:hidden" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileSagas {
	readonly sagas = input.required<TrackedFranchise[]>();

	protected readonly collapsedCount = COLLAPSED_SAGA_COUNT;
	protected readonly expanded = signal(false);
	protected readonly visibleSagas = computed(() =>
		this.expanded()
			? this.sagas()
			: this.sagas().slice(0, COLLAPSED_SAGA_COUNT)
	);
}
