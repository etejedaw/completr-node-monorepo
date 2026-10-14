import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	model
} from "@angular/core";

import { type Genre, type Platform } from "../../../core/models";
import { ChipGroup, type ChipOption } from "../chip-group/chip-group";
import { FilterSection } from "../filter-section/filter-section";
import { RangeInputs } from "../range-inputs/range-inputs";

@Component({
	selector: "app-game-filter-panel",
	imports: [ChipGroup, FilterSection, RangeInputs],
	template: `
		<div class="flex flex-col gap-6">
			@if (genreOptions().length > 0) {
				<app-filter-section label="Genres">
					<app-chip-group
						[options]="genreOptions()"
						[value]="genreValues()"
						(valueChange)="selectedGenres.set(asSet($event))"
					/>
				</app-filter-section>
			}

			@if (platformOptions().length > 0) {
				<app-filter-section label="Platforms">
					<app-chip-group
						[options]="platformOptions()"
						[value]="platformValues()"
						(valueChange)="selectedPlatforms.set(asSet($event))"
					/>
				</app-filter-section>
			}

			<app-filter-section label="Release year">
				<app-range-inputs
					class="max-w-md"
					label="Release year"
					minLabel="From"
					maxLabel="To"
					minPlaceholder="1950"
					[lowerBound]="1950"
					[upperBound]="2100"
					[step]="1"
					[(min)]="yearFrom"
					[(max)]="yearTo"
				/>
			</app-filter-section>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameFilterPanel {
	readonly allGenres = input<Genre[]>([]);
	readonly allPlatforms = input<Platform[]>([]);
	readonly selectedGenres = model<Set<string>>(new Set());
	readonly selectedPlatforms = model<Set<string>>(new Set());
	readonly yearFrom = model<number | null>(null);
	readonly yearTo = model<number | null>(null);

	protected readonly genreOptions = computed<ChipOption[]>(() =>
		this.allGenres().map(genre => ({
			value: genre.code,
			label: genre.name
		}))
	);
	protected readonly platformOptions = computed<ChipOption[]>(() =>
		this.allPlatforms().map(platform => ({
			value: platform.code,
			label: platform.abbreviation
		}))
	);
	protected readonly genreValues = computed(() =>
		Array.from(this.selectedGenres())
	);
	protected readonly platformValues = computed(() =>
		Array.from(this.selectedPlatforms())
	);

	protected asSet(values: readonly string[]): Set<string> {
		return new Set(values);
	}
}
