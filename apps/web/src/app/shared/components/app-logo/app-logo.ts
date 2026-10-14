import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

export type AppLogoSize = "md" | "lg";

const LOGO_SIZES: Record<
	AppLogoSize,
	{ gap: string; mark: string; wordmark: string }
> = {
	md: { gap: "gap-2", mark: "w-8 h-8 text-base", wordmark: "text-lg" },
	lg: { gap: "gap-2.5", mark: "w-9 h-9 text-lg", wordmark: "text-xl" }
};

@Component({
	selector: "app-logo",
	template: `
		<span
			aria-hidden="true"
			class="flex items-center justify-center shrink-0 rounded-lg font-display font-bold text-white bg-gradient-to-br from-brand to-brand-deep shadow-lg shadow-brand/25"
			[class]="sizing().mark"
			>C</span
		>
		@if (wordmark()) {
			<span
				class="font-display font-bold tracking-tight text-fg truncate"
				[class]="sizing().wordmark"
				>Completr</span
			>
		}
	`,
	host: {
		class: "flex items-center min-w-0",
		"[class]": "sizing().gap"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppLogo {
	readonly size = input<AppLogoSize>("md");
	readonly wordmark = input(true);

	protected readonly sizing = computed(() => LOGO_SIZES[this.size()]);
}
