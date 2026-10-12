import { ChangeDetectionStrategy, Component } from "@angular/core";

import { UiSkeleton } from "../../../shared/ui";

@Component({
	selector: "app-queue-skeleton",
	imports: [UiSkeleton],
	template: `
		<div class="flex gap-5 p-5 mb-6 rounded-card border border-line">
			<ui-skeleton
				variant="rect"
				class="block w-24 sm:w-36 aspect-[2/3] rounded-lg shrink-0"
			/>
			<div class="flex-1 flex flex-col gap-3 py-1">
				<ui-skeleton variant="text" class="block w-20" />
				<ui-skeleton variant="text" class="block w-2/3 h-6" />
				<ui-skeleton variant="text" class="block w-1/3" />
			</div>
		</div>
		<div class="divide-y divide-line">
			@for (i of rows; track i) {
				<div class="flex items-center gap-3 py-2.5">
					<ui-skeleton variant="text" class="block w-6" />
					<ui-skeleton
						variant="rect"
						class="block w-10 aspect-[2/3] rounded shrink-0"
					/>
					<ui-skeleton variant="text" class="block flex-1 max-w-xs" />
				</div>
			}
		</div>
	`,
	host: {
		class: "block",
		"aria-busy": "true",
		"aria-label": "Loading queue"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class QueueSkeleton {
	protected readonly rows = Array.from({ length: 6 }, (_, i) => i);
}
