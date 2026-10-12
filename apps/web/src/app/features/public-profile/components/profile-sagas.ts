import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { UiProgress } from "../../../shared/ui";
import { type FranchiseProgress } from "../../franchises/franchises";

const COLLAPSED_SAGA_COUNT = 5;

@Component({
	selector: "app-profile-sagas",
	imports: [RouterLink, UiProgress],
	template: `
		@if (sagas().length > 0) {
			<section
				class="p-4 rounded-card border border-line bg-surface"
				aria-labelledby="profile-sagas-heading"
			>
				<h2
					id="profile-sagas-heading"
					class="m-0 mb-3 flex items-center gap-2 font-display text-base font-semibold text-fg"
				>
					<span
						aria-hidden="true"
						class="material-icons text-lg text-brand"
						>collections_bookmark</span
					>
					Sagas
					<span
						class="ml-auto text-xs font-sans font-normal text-fg-muted tabular-nums"
						>{{ sagas().length }}</span
					>
				</h2>
				<ul class="list-none m-0 p-0 flex flex-col gap-3">
					@for (saga of visibleSagas(); track saga.franchise.id) {
						<li>
							<a
								class="block no-underline group"
								[routerLink]="[
									'/franchises',
									saga.franchise.code
								]"
							>
								<span
									class="flex items-baseline justify-between gap-2 mb-1.5 text-sm"
								>
									<span
										class="font-medium text-fg truncate group-hover:text-brand"
										>{{ saga.franchise.name }}</span
									>
									<span
										class="shrink-0 text-xs text-fg-muted tabular-nums"
										>{{ saga.completed }}/{{
											saga.total
										}}</span
									>
								</span>
								<ui-progress
									[value]="saga.completed"
									[max]="saga.total || 1"
									indicatorClass="bg-gradient-to-r from-brand to-success"
								/>
							</a>
						</li>
					}
				</ul>
				@if (sagas().length > collapsedCount) {
					<button
						type="button"
						class="tap-area mt-3 inline-flex items-center gap-0.5 p-0 bg-transparent border-0 text-xs font-medium text-fg-secondary cursor-pointer hover:text-brand"
						[attr.aria-expanded]="expanded()"
						(click)="expanded.set(!expanded())"
					>
						{{
							expanded()
								? "Show fewer"
								: "Show all " + sagas().length
						}}
						<span
							aria-hidden="true"
							class="material-icons text-base"
							>{{
								expanded() ? "expand_less" : "expand_more"
							}}</span
						>
					</button>
				}
			</section>
		} @else if (isSelf()) {
			<p
				class="m-0 p-4 rounded-card border border-dashed border-line text-sm text-fg-muted"
			>
				Track a saga from any franchise page to follow your progress
				here.
			</p>
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
