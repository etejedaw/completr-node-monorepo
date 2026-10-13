import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

@Component({
	selector: "app-flip-card",
	template: `
		<div
			class="relative h-full transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] [transform-style:preserve-3d] motion-reduce:transition-none"
			[style.transform]="rotation()"
		>
			<div
				class="h-full [backface-visibility:hidden]"
				[attr.inert]="flipped() ? '' : null"
				[attr.aria-hidden]="flipped()"
			>
				<ng-content select="[flipCardFront]" />
			</div>
			<div
				class="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]"
				[attr.inert]="flipped() ? null : ''"
				[attr.aria-hidden]="!flipped()"
			>
				<ng-content select="[flipCardBack]" />
			</div>
		</div>
	`,
	host: { class: "block [perspective:1400px]" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlipCard {
	readonly flipped = input(false);

	protected readonly rotation = computed(() =>
		this.flipped() ? "rotateY(180deg)" : "rotateY(0deg)"
	);
}
