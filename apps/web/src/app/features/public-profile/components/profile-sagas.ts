import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { UiButton, UiProgress } from "../../../shared/ui";
import { type FranchiseProgress } from "../../franchises/franchises";
import { ProfileSectionHeader } from "./profile-section-header";

const COLLAPSED_SAGA_COUNT = 6;

@Component({
	selector: "app-profile-sagas",
	imports: [RouterLink, ProfileSectionHeader, UiButton, UiProgress],
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
									<span class="material-icons text-xl">{{
										saga.completed >= saga.total &&
										saga.total > 0
											? "emoji_events"
											: "collections_bookmark"
									}}</span>
								</span>
								<span class="flex-1 min-w-0">
									<span
										class="flex items-baseline justify-between gap-2 mb-1.5"
									>
										<span
											class="text-sm font-medium text-fg truncate group-hover:text-brand"
											>{{ saga.franchise.name }}</span
										>
										<span
											class="shrink-0 text-xs text-fg-muted tabular-nums"
											>{{ saga.completed }}/{{
												saga.total
											}}
											<span class="sr-only"
												>games completed</span
											></span
										>
									</span>
									<ui-progress
										[value]="saga.completed"
										[max]="saga.total || 1"
										trackClass="h-1.5"
										indicatorClass="bg-gradient-to-r from-brand to-success"
									/>
								</span>
							</a>
						</li>
					}
				</ul>
				@if (sagas().length > collapsedCount) {
					<button
						uiButton
						variant="ghost"
						class="mt-3"
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
		} @else if (isSelf()) {
			<section aria-labelledby="profile-sagas-heading">
				<app-profile-section-header
					heading="Sagas"
					headingId="profile-sagas-heading"
					eyebrow="Franchises"
				/>
				<div
					class="flex flex-wrap items-center gap-4 p-4 rounded-card border border-dashed border-line"
				>
					<span
						aria-hidden="true"
						class="shrink-0 w-10 h-10 inline-flex items-center justify-center rounded-card bg-brand-subtle text-brand"
					>
						<span class="material-icons text-xl"
							>collections_bookmark</span
						>
					</span>
					<p
						class="m-0 flex-1 min-w-[12rem] text-sm text-fg-secondary"
					>
						Track a saga from any franchise page to follow your
						progress here.
					</p>
					<a
						uiButton
						variant="secondary"
						size="sm"
						routerLink="/games"
						>Browse games</a
					>
				</div>
			</section>
		}
	`,
	host: { class: "block empty:hidden" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileSagas {
	readonly sagas = input.required<FranchiseProgress[]>();
	readonly isSelf = input(false);

	protected readonly collapsedCount = COLLAPSED_SAGA_COUNT;
	protected readonly expanded = signal(false);
	protected readonly visibleSagas = computed(() =>
		this.expanded()
			? this.sagas()
			: this.sagas().slice(0, COLLAPSED_SAGA_COUNT)
	);
}
