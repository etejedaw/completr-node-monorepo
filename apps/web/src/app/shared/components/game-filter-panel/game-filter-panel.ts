import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	model
} from "@angular/core";
import { NgpToggleGroup, NgpToggleGroupItem } from "ng-primitives/toggle-group";
import { Genre, Platform } from "../../../core/models";
import { UiInput } from "../../ui";

@Component({
	selector: "app-game-filter-panel",
	imports: [UiInput, NgpToggleGroup, NgpToggleGroupItem],
	template: `
		<div class="flex flex-col gap-4">
			@if (allGenres().length > 0) {
				<div>
					<span
						class="block text-[0.625rem] font-semibold uppercase tracking-wider text-fg-muted mb-2"
						>Genres</span
					>
					<div
						ngpToggleGroup
						ngpToggleGroupType="multiple"
						[ngpToggleGroupValue]="genreValues()"
						(ngpToggleGroupValueChange)="
							selectedGenres.set(asSet($event))
						"
						class="flex flex-wrap gap-1.5"
					>
						@for (g of allGenres(); track g.id) {
							<button
								type="button"
								ngpToggleGroupItem
								[ngpToggleGroupItemValue]="g.code"
								class="px-2.5 py-1 rounded-full border text-xs font-medium cursor-pointer transition bg-input-bg border-line text-fg-secondary hover:border-brand hover:text-brand data-[selected]:bg-brand-subtle data-[selected]:border-brand data-[selected]:text-brand data-[focus-visible]:outline data-[focus-visible]:outline-2 data-[focus-visible]:outline-brand data-[focus-visible]:outline-offset-2"
							>
								{{ g.name }}
							</button>
						}
					</div>
				</div>
			}

			@if (allPlatforms().length > 0) {
				<div>
					<span
						class="block text-[0.625rem] font-semibold uppercase tracking-wider text-fg-muted mb-2"
						>Platforms</span
					>
					<div
						ngpToggleGroup
						ngpToggleGroupType="multiple"
						[ngpToggleGroupValue]="platformValues()"
						(ngpToggleGroupValueChange)="
							selectedPlatforms.set(asSet($event))
						"
						class="flex flex-wrap gap-1.5"
					>
						@for (p of allPlatforms(); track p.id) {
							<button
								type="button"
								ngpToggleGroupItem
								[ngpToggleGroupItemValue]="p.code"
								class="px-2.5 py-1 rounded-full border text-xs font-medium cursor-pointer transition bg-input-bg border-line text-fg-secondary hover:border-brand hover:text-brand data-[selected]:bg-brand-subtle data-[selected]:border-brand data-[selected]:text-brand data-[focus-visible]:outline data-[focus-visible]:outline-2 data-[focus-visible]:outline-brand data-[focus-visible]:outline-offset-2"
							>
								{{ p.abbreviation }}
							</button>
						}
					</div>
				</div>
			}

			<div class="grid grid-cols-2 gap-3 max-w-md">
				<label class="flex flex-col gap-1 text-xs text-fg-muted">
					Year from
					<input
						uiInput
						size="sm"
						type="number"
						min="1950"
						max="2100"
						[value]="yearFrom() ?? ''"
						(input)="setYearFrom($any($event.target).value)"
					/>
				</label>
				<label class="flex flex-col gap-1 text-xs text-fg-muted">
					Year to
					<input
						uiInput
						size="sm"
						type="number"
						min="1950"
						max="2100"
						[value]="yearTo() ?? ''"
						(input)="setYearTo($any($event.target).value)"
					/>
				</label>
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameFilterPanel {
	allGenres = input<Genre[]>([]);
	allPlatforms = input<Platform[]>([]);
	selectedGenres = model<Set<string>>(new Set());
	selectedPlatforms = model<Set<string>>(new Set());
	yearFrom = model<number | null>(null);
	yearTo = model<number | null>(null);

	protected readonly genreValues = computed(() =>
		Array.from(this.selectedGenres())
	);
	protected readonly platformValues = computed(() =>
		Array.from(this.selectedPlatforms())
	);

	protected asSet(values: string[]): Set<string> {
		return new Set(values);
	}

	setYearFrom(value: string) {
		const trimmed = value.trim();
		this.yearFrom.set(trimmed ? Number(trimmed) : null);
	}

	setYearTo(value: string) {
		const trimmed = value.trim();
		this.yearTo.set(trimmed ? Number(trimmed) : null);
	}
}
