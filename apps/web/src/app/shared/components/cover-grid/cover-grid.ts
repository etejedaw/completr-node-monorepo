import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { UiSkeleton } from "../../ui";

@Component({
	selector: "app-cover-grid",
	imports: [UiSkeleton],
	template: `
		@if (loading()) {
			<div
				class="poster-grid"
				aria-busy="true"
				[attr.aria-label]="loadingLabel()"
			>
				@for (i of skeletonRange; track i) {
					<div class="flex flex-col gap-2">
						<ui-skeleton
							variant="rect"
							class="block w-full aspect-[2/3] rounded-lg"
						/>
						<ui-skeleton variant="text" class="block w-3/4" />
					</div>
				}
			</div>
		} @else {
			<ul
				class="list-none m-0 p-0 poster-grid"
				[class.poster-grid-actionable]="actionable()"
			>
				<ng-content />
			</ul>
		}
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class CoverGrid {
	readonly loading = input(false);
	readonly actionable = input(false);
	readonly loadingLabel = input("Loading");

	protected readonly skeletonRange = Array.from({ length: 12 }, (_, i) => i);
}
