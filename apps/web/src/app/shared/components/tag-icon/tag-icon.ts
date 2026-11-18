import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import { tagColorOf, tagIconOf } from "../../utils/tag-appearance";

@Component({
	selector: "app-tag-icon",
	template: "{{ glyph() }}",
	host: {
		class: "material-icons",
		"aria-hidden": "true",
		"[style.color]": "tint()"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class TagIcon {
	readonly icon = input<string | null | undefined>(null);
	readonly color = input<string | null | undefined>(null);

	protected readonly glyph = computed(() => tagIconOf(this.icon()));
	protected readonly tint = computed(() => tagColorOf(this.color()));
}
