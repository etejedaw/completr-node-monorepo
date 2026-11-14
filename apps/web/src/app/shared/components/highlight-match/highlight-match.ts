import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import { type HighlightedText } from "./highlight-match.model";

export function splitAroundMatch(text: string, query: string): HighlightedText {
	const needle = query.trim().toLocaleLowerCase();
	const start = needle ? text.toLocaleLowerCase().indexOf(needle) : -1;
	if (start === -1) return { before: text, match: "", after: "" };
	const end = start + needle.length;
	return {
		before: text.slice(0, start),
		match: text.slice(start, end),
		after: text.slice(end)
	};
}

@Component({
	selector: "app-highlight-match",
	template: `
		<span [textContent]="parts().before"></span>
		@if (parts().match) {
			<mark
				class="bg-brand-subtle text-fg rounded-sm"
				[textContent]="parts().match"
			></mark>
		}
		<span [textContent]="parts().after"></span>
	`,
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class HighlightMatch {
	readonly text = input.required<string>();
	readonly query = input("");

	protected readonly parts = computed(() =>
		splitAroundMatch(this.text(), this.query())
	);
}
