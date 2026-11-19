import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { type TagAppearance } from "../../../core/services/mood-tags.model";
import { TagIcon } from "../tag-icon/tag-icon";

@Component({
	selector: "app-mood-tags-chips",
	imports: [TagIcon],
	template: `
		@if (tags() && tags()!.length > 0) {
			<div class="flex flex-wrap gap-1" [class]="containerClass()">
				@for (tag of tags(); track tag) {
					@let look = appearance()?.get(tag);
					<span
						class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-brand-subtle text-brand text-tiny font-medium leading-none"
					>
						@if (look) {
							<app-tag-icon
								class="!text-[0.75rem]"
								[icon]="look.icon"
								[color]="look.color"
							/>
						}
						{{ tag }}
					</span>
				}
			</div>
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class MoodTagsChips {
	tags = input<string[] | null | undefined>([]);
	containerClass = input<string>("");
	appearance = input<ReadonlyMap<string, TagAppearance> | null>(null);
}
