import { ChangeDetectionStrategy, Component, input } from "@angular/core";

export type UiSkeletonVariant = "rect" | "circle" | "text";

@Component({
	selector: "ui-skeleton",
	template: `<span
		class="block bg-fg-muted/10 animate-[skeletonPulse_1.4s_ease-in-out_infinite]"
		[class.rounded-md]="variant() === 'rect'"
		[class.rounded-full]="variant() === 'circle'"
		[class.rounded-sm]="variant() === 'text'"
		[class.h-3]="variant() === 'text'"
	></span>`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiSkeleton {
	variant = input<UiSkeletonVariant>("rect");
}
