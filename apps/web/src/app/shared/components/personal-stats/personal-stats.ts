import { ChangeDetectionStrategy, Component, input } from "@angular/core";

@Component({
	selector: "app-personal-stats",
	template: `
		@if (inline()) {
			<span class="inline-flex items-center gap-1.5 flex-wrap">
				@if (realDuration()) {
					<span
						class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-medium text-fg-secondary bg-input-bg border border-line"
					>
						<span class="material-icons text-[0.75rem]"
							>schedule</span
						>
						Real {{ realDuration() }}h
					</span>
				}
				@if (personalRatio()) {
					<span
						class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold text-warning bg-warning/10 border border-warning/20"
					>
						P. Ratio {{ personalRatio() }}
					</span>
				}
			</span>
		} @else {
			<div class="flex flex-col items-end gap-3">
				@if (personalRatio()) {
					<div class="flex flex-col items-end leading-none">
						<span class="text-lg font-semibold text-warning">{{
							personalRatio()
						}}</span>
						<span
							class="text-[0.625rem] uppercase tracking-wider text-fg-muted mt-1"
							>Personal</span
						>
					</div>
				}
				@if (realDuration()) {
					<div class="flex flex-col items-end leading-none">
						<span class="text-base font-semibold text-fg-secondary"
							>{{ realDuration() }}h</span
						>
						<span
							class="text-[0.625rem] uppercase tracking-wider text-fg-muted mt-1"
							>Real</span
						>
					</div>
				}
			</div>
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PersonalStats {
	realDuration = input<number | null | undefined>();
	personalRatio = input<number | null | undefined>();
	inline = input<boolean>(false);
}
