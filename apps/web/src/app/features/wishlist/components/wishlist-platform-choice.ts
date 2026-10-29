import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	model
} from "@angular/core";

import { ChipGroup } from "../../../shared/components/chip-group/chip-group";
import { type ChipOption } from "../../../shared/components/chip-group/chip-group.model";
import { type WishlistPlatformOption } from "./wishlist-platform-choice.model";

@Component({
	selector: "app-wishlist-platform-choice",
	imports: [ChipGroup],
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
				<app-chip-group
					mode="single"
					label="Pick a platform (optional)"
					[allowEmpty]="false"
					[options]="chipOptions()"
					[value]="selectedValues()"
					(valueChange)="select($event)"
				/>
			</fieldset>
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class WishlistPlatformChoice {
	readonly platforms = input.required<readonly WishlistPlatformOption[]>();
	readonly selected = model<string | null>(null);

	protected readonly chipOptions = computed<ChipOption[]>(() =>
		this.platforms().map(platform => ({
			value: platform.id,
			label: platform.abbreviation,
			hint: platform.name
		}))
	);
	protected readonly selectedValues = computed(() => {
		const selected = this.selected();
		return selected ? [selected] : [];
	});

	protected select(values: readonly string[]) {
		const [value] = values;
		if (value) this.selected.set(value);
	}
}
