import {
	ChangeDetectionStrategy,
	Component,
	input,
	model
} from "@angular/core";

export interface WishlistPlatformOption {
	id: string;
	name: string;
	abbreviation: string;
}

@Component({
	selector: "app-wishlist-platform-choice",
	template: `
		@if (platforms().length === 0) {
			<p class="m-0 text-[0.8125rem] text-fg-muted">
				No platforms available for this game. You can add it without a
				platform.
			</p>
		} @else {
			<fieldset class="m-0 p-0 border-0">
				<legend class="mb-2.5 text-xs font-semibold text-fg-secondary">
					Pick a platform
					<span class="font-normal text-fg-muted">(optional)</span>
				</legend>
				<div class="flex flex-wrap gap-2">
					@for (platform of platforms(); track platform.id) {
						<button
							type="button"
							class="min-h-[32px] max-md:min-h-[44px] max-md:min-w-[44px] pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] px-3 rounded-full border text-xs font-medium cursor-pointer transition"
							[class]="
								selected() === platform.id
									? 'bg-brand-subtle border-brand text-brand'
									: 'bg-input-bg border-line text-fg-secondary hover:border-brand hover:text-brand'
							"
							[attr.aria-pressed]="selected() === platform.id"
							[attr.title]="platform.name"
							(click)="selected.set(platform.id)"
						>
							{{ platform.abbreviation }}
						</button>
					}
				</div>
			</fieldset>
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class WishlistPlatformChoice {
	readonly platforms = input.required<readonly WishlistPlatformOption[]>();
	readonly selected = model<string | null>(null);
}
