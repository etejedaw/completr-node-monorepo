import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import {
	NgpAvatar,
	NgpAvatarFallback,
	NgpAvatarImage
} from "ng-primitives/avatar";

export type UiAvatarRing = "premium" | "admin" | null;

@Component({
	selector: "ui-avatar",
	imports: [NgpAvatar, NgpAvatarImage, NgpAvatarFallback],
	template: `
		<span
			ngpAvatar
			class="relative block w-full h-full rounded-full overflow-hidden bg-brand-subtle text-brand"
		>
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
			@if (ring(); as tier) {
				<span
					aria-hidden="true"
					class="absolute inset-0 rounded-full border-[length:clamp(2px,0.08em,4px)] pointer-events-none"
					[class]="ringBorderClass[tier]"
				></span>
			}
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
	ring = input<UiAvatarRing>(null);

	protected readonly ringBorderClass: Record<
		NonNullable<UiAvatarRing>,
		string
	> = {
		premium: "border-premium",
		admin: "border-admin"
	};

	protected readonly initial = computed(() => {
		const n = this.name();
		return n ? n.charAt(0).toUpperCase() : "?";
	});
}
