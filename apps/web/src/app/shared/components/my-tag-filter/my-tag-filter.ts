import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";

import { UiMultiOptionPicker, type UiPickerOption } from "../../ui";

@Component({
	selector: "app-my-tag-filter",
	imports: [UiMultiOptionPicker],
	template: `
		@if (options().length > 0) {
			<ui-multi-option-picker
				variant="compact"
				size="md"
				label="Tags"
				heading="Filter by your tags"
				placeholder="Any"
				placeholderIcon="sell"
				noun="tags"
				nounSingular="tag"
				searchLabel="Search your tags"
				[options]="options()"
				[values]="values()"
				(valuesChange)="valuesChange.emit($event)"
			/>
		}
	`,
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyTagFilter {
	readonly options = input.required<readonly UiPickerOption[]>();
	readonly values = input.required<readonly string[]>();
	readonly valuesChange = output<readonly string[]>();
}
