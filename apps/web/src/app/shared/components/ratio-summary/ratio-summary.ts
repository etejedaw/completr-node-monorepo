import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

type RatioComparison = "better" | "worse" | "even";

interface ComparisonStyle {
	icon: string;
	textClass: string;
	caption: string;
}

const COMPARISON_STYLES: Record<RatioComparison, ComparisonStyle> = {
	better: {
		icon: "trending_up",
		textClass: "text-success",
		caption: "better than estimated"
	},
	worse: {
		icon: "trending_down",
		textClass: "text-warning",
		caption: "worse than estimated"
	},
	even: {
		icon: "trending_flat",
		textClass: "text-fg-secondary",
		caption: "as estimated"
	}
};

@Component({
	selector: "app-ratio-summary",
	template: `
		@if (comparison(); as style) {
			<div
				class="flex flex-col gap-1 leading-none"
				[title]="personalTooltip()"
			>
				<span
					class="text-[0.5625rem] font-semibold uppercase tracking-[0.18em] text-fg-muted"
					>{{ personalLabel() }}</span
				>
				<span
					class="inline-flex items-center gap-0.5 text-lg font-bold tabular-nums"
					[class]="style.textClass"
				>
					<span
						aria-hidden="true"
						class="material-icons !text-base"
						>{{ style.icon }}</span
					>
					{{ personalRatio() }}
					<span class="sr-only">{{ style.caption }}</span>
				</span>
			</div>
		}
		<div
			class="flex flex-col items-end gap-1 leading-none"
			title="Score per estimated hour of play"
		>
			<span
				class="text-[0.5625rem] font-semibold uppercase tracking-[0.18em] text-fg-muted"
				>Ratio</span
			>
			<span
				class="font-display text-2xl sm:text-3xl font-bold text-brand tabular-nums"
				>{{ ratio() ?? "—" }}</span
			>
		</div>
	`,
	host: { class: "flex items-end gap-5" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RatioSummary {
	readonly ratio = input<number | null | undefined>(null);
	readonly personalRatio = input<number | null | undefined>(null);
	readonly personalLabel = input("Your run");

	protected readonly comparison = computed<ComparisonStyle | null>(() => {
		const personal = this.personalRatio();
		if (personal === null || personal === undefined) return null;
		const estimated = this.ratio();
		if (estimated === null || estimated === undefined) {
			return COMPARISON_STYLES.even;
		}
		if (personal > estimated) return COMPARISON_STYLES.better;
		if (personal < estimated) return COMPARISON_STYLES.worse;
		return COMPARISON_STYLES.even;
	});

	protected readonly personalTooltip = computed(() => {
		const caption = this.comparison()?.caption ?? "";
		return `Score per hour you actually played: ${this.personalRatio()} (${caption})`;
	});
}
