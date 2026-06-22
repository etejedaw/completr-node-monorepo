import {
	ChangeDetectionStrategy,
	Component,
	input,
	model
} from "@angular/core";
import { Genre, Platform } from "../../../core/models";
import { UiInput } from "../../ui";

@Component({
	selector: "app-game-filter-panel",
	imports: [UiInput],
	template: `
		<div class="flex flex-col gap-4">
			@if (allGenres().length > 0) {
				<div>
					<span class="block text-[0.625rem] font-semibold uppercase tracking-wider text-fg-muted mb-2">Genres</span>
					<div class="flex flex-wrap gap-1.5">
						@for (g of allGenres(); track g.id) {
							<button type="button" class="px-2.5 py-1 rounded-full border text-xs font-medium cursor-pointer transition"
								[class.bg-brand-subtle]="isGenreSelected(g.code)"
								[class.border-brand]="isGenreSelected(g.code)"
								[class.text-brand]="isGenreSelected(g.code)"
								[class.bg-input-bg]="!isGenreSelected(g.code)"
								[class.border-line]="!isGenreSelected(g.code)"
								[class.text-fg-secondary]="!isGenreSelected(g.code)"
								[class.hover:border-brand]="!isGenreSelected(g.code)"
								[class.hover:text-brand]="!isGenreSelected(g.code)"
								(click)="toggleGenre(g.code)"
							>{{ g.name }}</button>
						}
					</div>
				</div>
			}

			@if (allPlatforms().length > 0) {
				<div>
					<span class="block text-[0.625rem] font-semibold uppercase tracking-wider text-fg-muted mb-2">Platforms</span>
					<div class="flex flex-wrap gap-1.5">
						@for (p of allPlatforms(); track p.id) {
							<button type="button" class="px-2.5 py-1 rounded-full border text-xs font-medium cursor-pointer transition"
								[class.bg-brand-subtle]="isPlatformSelected(p.code)"
								[class.border-brand]="isPlatformSelected(p.code)"
								[class.text-brand]="isPlatformSelected(p.code)"
								[class.bg-input-bg]="!isPlatformSelected(p.code)"
								[class.border-line]="!isPlatformSelected(p.code)"
								[class.text-fg-secondary]="!isPlatformSelected(p.code)"
								[class.hover:border-brand]="!isPlatformSelected(p.code)"
								[class.hover:text-brand]="!isPlatformSelected(p.code)"
								(click)="togglePlatform(p.code)"
							>{{ p.abbreviation }}</button>
						}
					</div>
				</div>
			}

			<div class="grid grid-cols-2 gap-3 max-w-md">
				<label class="flex flex-col gap-1 text-xs text-fg-muted">
					Year from
					<input uiInput size="sm" type="number" min="1950" max="2100"
						[value]="yearFrom() ?? ''"
						(input)="setYearFrom($any($event.target).value)" />
				</label>
				<label class="flex flex-col gap-1 text-xs text-fg-muted">
					Year to
					<input uiInput size="sm" type="number" min="1950" max="2100"
						[value]="yearTo() ?? ''"
						(input)="setYearTo($any($event.target).value)" />
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

	isGenreSelected(code: string): boolean {
		return this.selectedGenres().has(code);
	}

	isPlatformSelected(code: string): boolean {
		return this.selectedPlatforms().has(code);
	}

	toggleGenre(code: string) {
		const next = new Set(this.selectedGenres());
		if (next.has(code)) next.delete(code);
		else next.add(code);
		this.selectedGenres.set(next);
	}

	togglePlatform(code: string) {
		const next = new Set(this.selectedPlatforms());
		if (next.has(code)) next.delete(code);
		else next.add(code);
		this.selectedPlatforms.set(next);
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
