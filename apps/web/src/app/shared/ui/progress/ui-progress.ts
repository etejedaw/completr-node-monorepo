import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import {
	NgpProgress,
	NgpProgressIndicator,
	type NgpProgressValueTextFn
} from "ng-primitives/progress";

/**
 * Linear progress bar with ARIA roles (`role="progressbar"`, `aria-valuenow`,
 * etc.) provided by `NgpProgress`. Override `trackClass` or `indicatorClass`
 * to restyle; `indicatorStyle` accepts inline CSS for gradient fills.
 */
@Component({
	selector: "ui-progress",
	imports: [NgpProgress, NgpProgressIndicator],
	template: `
		<div
			ngpProgress
			[ngpProgressValue]="value()"
			[ngpProgressMax]="max()"
			[ngpProgressValueLabel]="valueLabel()"
			class="block w-full overflow-hidden rounded-full bg-input-bg"
			[class]="trackClass()"
		>
			<div
				ngpProgressIndicator
				class="h-full rounded-full transition-[width] duration-300 ease-out"
				[class]="indicatorClass()"
				[style]="indicatorStyle()"
				[style.width.%]="percent()"
			></div>
		</div>
	`,
	host: { class: "block w-full" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiProgress {
	value = input.required<number>();
	max = input<number>(100);
	valueLabel = input<NgpProgressValueTextFn>(
		(value, max) => `${Math.round((value / max) * 100)}%`
	);
	trackClass = input<string>("h-1.5");
	indicatorClass = input<string>("bg-brand");
	indicatorStyle = input<string | null>(null);

	protected readonly percent = computed(() => {
		const max = this.max();
		if (max <= 0) return 0;
		return Math.max(0, Math.min(100, (this.value() / max) * 100));
	});
}
