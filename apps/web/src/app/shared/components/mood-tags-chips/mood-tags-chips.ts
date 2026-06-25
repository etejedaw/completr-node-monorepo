import { ChangeDetectionStrategy, Component, input } from "@angular/core";

@Component({
	selector: "app-mood-tags-chips",
	template: `
		@if (tags() && tags()!.length > 0) {
			<div class="flex flex-wrap gap-1" [class]="containerClass()">
				@for (tag of tags(); track tag) {
					<span class="inline-block px-1.5 py-0.5 rounded-full bg-brand-subtle text-brand text-[0.625rem] font-medium leading-none">{{ tag }}</span>
				}
			</div>
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class MoodTagsChips {
	tags = input<string[] | null | undefined>([]);
	containerClass = input<string>("");
}
