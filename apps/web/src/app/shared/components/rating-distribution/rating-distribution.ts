import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import { type RatingDistributionBucket } from "./rating-distribution.model";

@Component({
	selector: "app-rating-distribution",
	template: `
		<ul
			class="list-none m-0 p-0 flex flex-col gap-1.5"
			[attr.aria-label]="label()"
		>
			@for (bucket of rows(); track bucket.stars) {
				<li class="flex items-center gap-2.5 text-xs">
					<span
						class="w-7 inline-flex items-center gap-0.5 text-fg-secondary tabular-nums"
						>{{ bucket.stars
						}}<span
							aria-hidden="true"
							class="material-icons text-[0.75rem] text-rating"
							>star</span
						></span
					>
					<span
						class="flex-1 h-1.5 rounded-full bg-line overflow-hidden"
						aria-hidden="true"
					>
						<span
							class="block h-full rounded-full bg-rating/80 transition-[width] duration-500 motion-reduce:transition-none"
							[style.width.%]="bucket.percent"
						></span>
					</span>
					<span class="min-w-6 text-right text-fg-muted tabular-nums"
						>{{ bucket.count
						}}<span class="sr-only">
							{{ itemLabel() }} with
							{{ bucket.stars }} stars</span
						></span
					>
				</li>
			}
		</ul>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RatingDistribution {
	readonly buckets = input.required<readonly RatingDistributionBucket[]>();
	readonly label = input("Rating distribution");
	readonly itemLabel = input("reviews");

	protected readonly rows = computed(() => {
		const buckets = this.buckets();
		const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
		return buckets.map(bucket => ({
			...bucket,
			percent: total ? (bucket.count / total) * 100 : 0
		}));
	});
}
