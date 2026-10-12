import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	model
} from "@angular/core";

export interface PlatformCount {
	id: string;
	label: string;
	count: number;
}

interface PlatformRef {
	id: string;
	abbreviation: string;
}

export const ANY_PLATFORM_ID = "any";

export function countByPlatform<T>(
	items: T[],
	platformOf: (item: T) => PlatformRef | null | undefined
): PlatformCount[] {
	const counts = new Map<string, PlatformCount>();
	for (const item of items) {
		const platform = platformOf(item);
		const id = platform?.id ?? ANY_PLATFORM_ID;
		const existing = counts.get(id);
		if (existing) existing.count++;
		else
			counts.set(id, {
				id,
				label: platform?.abbreviation ?? "Any platform",
				count: 1
			});
	}
	return [...counts.values()].sort((a, b) => b.count - a.count);
}

export function matchesPlatform(
	platform: PlatformRef | null | undefined,
	selectedId: string
): boolean {
	if (!selectedId) return true;
	return (platform?.id ?? ANY_PLATFORM_ID) === selectedId;
}

@Component({
	selector: "app-platform-filter",
	template: `
		<nav aria-label="Filter by platform" class="flex flex-wrap gap-2">
			@for (option of options(); track option.id) {
				<button
					type="button"
					class="inline-flex items-center gap-1.5 h-9 pointer-coarse:min-h-[44px] px-3.5 rounded-full border border-line bg-surface/60 backdrop-blur text-sm font-medium text-fg-secondary cursor-pointer transition hover:border-line-hover hover:text-fg"
					[class.!text-brand]="selected() === option.id"
					[class.!border-brand]="selected() === option.id"
					[class.!bg-brand-subtle]="selected() === option.id"
					[attr.aria-pressed]="selected() === option.id"
					(click)="selected.set(option.id)"
				>
					{{ option.label }}
					<span class="text-xs text-fg-muted tabular-nums">{{
						option.count
					}}</span>
				</button>
			}
		</nav>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlatformFilter {
	readonly platforms = input.required<PlatformCount[]>();
	readonly total = input.required<number>();
	readonly selected = model("");

	protected readonly options = computed(() => [
		{ id: "", label: "All", count: this.total() },
		...this.platforms()
	]);
}
