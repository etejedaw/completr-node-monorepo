import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import { NgpAvatar, NgpAvatarFallback, NgpAvatarImage } from "ng-primitives/avatar";

@Component({
	selector: "ui-avatar",
	imports: [NgpAvatar, NgpAvatarImage, NgpAvatarFallback],
	template: `
		<span ngpAvatar class="block w-full h-full rounded-full overflow-hidden bg-brand-subtle text-brand">
			@if (src()) {
				<img
					ngpAvatarImage
					[src]="src()"
					[alt]="alt() || name() || ''"
					class="w-full h-full object-cover"
					loading="lazy"
				/>
			}
			<span
				ngpAvatarFallback
				class="flex w-full h-full items-center justify-center font-bold uppercase select-none"
				[attr.aria-label]="alt() || name() || 'avatar'"
			>
				{{ initial() }}
			</span>
		</span>
	`,
	host: {
		class: "inline-block shrink-0 rounded-full overflow-hidden"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiAvatar {
	src = input<string | null | undefined>(null);
	name = input<string | null | undefined>(null);
	alt = input<string | null | undefined>(null);

	protected readonly initial = computed(() => {
		const n = this.name();
		return n ? n.charAt(0).toUpperCase() : "?";
	});
}
