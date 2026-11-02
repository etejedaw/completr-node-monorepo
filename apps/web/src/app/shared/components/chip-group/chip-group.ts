import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	model
} from "@angular/core";

import { type ChipOption } from "./chip-group.model";

export type ChipGroupMode = "multiple" | "single";

const ARROW_STEP: Record<string, number> = {
	ArrowRight: 1,
	ArrowDown: 1,
	ArrowLeft: -1,
	ArrowUp: -1
};

@Component({
	selector: "app-chip-group",
	template: `
		<div
			class="flex flex-wrap gap-2"
			[attr.role]="mode() === 'single' ? 'radiogroup' : 'group'"
			[attr.aria-label]="label() || null"
		>
			@for (option of options(); track option.value; let index = $index) {
				<button
					type="button"
					class="inline-flex items-center gap-1.5 px-3 py-1.5 tap:min-h-[44px] tap:min-w-[44px] justify-center rounded-full border text-xs font-medium font-sans cursor-pointer transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
					[class]="
						isSelected(option.value)
							? 'border-brand bg-brand-subtle text-brand'
							: 'border-line bg-input-bg text-fg-secondary hover:border-line-hover hover:text-fg'
					"
					[attr.role]="mode() === 'single' ? 'radio' : null"
					[attr.aria-checked]="
						mode() === 'single' ? isSelected(option.value) : null
					"
					[attr.aria-pressed]="
						mode() === 'multiple' ? isSelected(option.value) : null
					"
					[attr.tabindex]="tabIndexFor(option.value, index)"
					[attr.data-chip-value]="option.value"
					[attr.title]="option.hint ?? null"
					(click)="toggle(option.value)"
				>
					@if (option.icon) {
						<span
							aria-hidden="true"
							class="material-icons text-sm"
							>{{ option.icon }}</span
						>
					}
					{{ option.label }}
					@if (option.count !== undefined && option.count !== null) {
						<span class="tabular-nums text-fg-muted">{{
							option.count
						}}</span>
					}
				</button>
			}
		</div>
	`,
	host: { class: "block", "(keydown)": "onKeydown($event)" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChipGroup {
	readonly options = input.required<readonly ChipOption[]>();
	readonly mode = input<ChipGroupMode>("multiple");
	readonly label = input("");
	readonly allowEmpty = input(true);
	readonly value = model<readonly string[]>([]);

	private readonly selectedSet = computed(() => new Set(this.value()));

	protected isSelected(value: string): boolean {
		return this.selectedSet().has(value);
	}

	protected tabIndexFor(value: string, index: number): number | null {
		if (this.mode() === "multiple") return null;
		const selected = this.value()[0];
		const hasSelectedOption = this.options().some(
			option => option.value === selected
		);
		if (hasSelectedOption) return value === selected ? 0 : -1;
		return index === 0 ? 0 : -1;
	}

	protected toggle(value: string) {
		if (this.mode() === "single") {
			this.selectSingle(value);
			return;
		}
		const next = new Set(this.value());
		if (next.has(value)) next.delete(value);
		else next.add(value);
		this.value.set([...next]);
	}

	protected onKeydown(event: KeyboardEvent) {
		if (this.mode() !== "single") return;
		const step = ARROW_STEP[event.key];
		if (!step) return;
		const options = this.options();
		if (options.length === 0) return;
		event.preventDefault();
		const current = options.findIndex(
			option => option.value === this.value()[0]
		);
		const nextIndex =
			(Math.max(current, 0) + step + options.length) % options.length;
		const next = options[nextIndex];
		this.value.set([next.value]);
		const group = event.currentTarget as HTMLElement;
		group
			.querySelector<HTMLElement>(
				`[data-chip-value="${CSS.escape(next.value)}"]`
			)
			?.focus();
	}

	private selectSingle(value: string) {
		const isCurrent = this.value()[0] === value;
		if (isCurrent && this.allowEmpty()) this.value.set([]);
		else this.value.set([value]);
	}
}
