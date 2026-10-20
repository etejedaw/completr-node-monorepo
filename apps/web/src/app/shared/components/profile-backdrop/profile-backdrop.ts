import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	signal
} from "@angular/core";

import { CoverUrlPipe } from "../../pipes/cover-url";

@Component({
	selector: "app-profile-backdrop",
	imports: [CoverUrlPipe],
	template: `
		<div
			class="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_0%,var(--color-brand-glow),transparent_60%),radial-gradient(ellipse_at_10%_100%,var(--color-brand-subtle),transparent_50%)]"
		></div>
		<div
			class="absolute inset-0 opacity-[0.07] bg-[linear-gradient(var(--color-line-hover)_1px,transparent_1px),linear-gradient(90deg,var(--color-line-hover)_1px,transparent_1px)] bg-[size:32px_32px]"
		></div>
		@if (url(); as backdrop) {
			<div
				class="absolute inset-0 bg-canvas transition-opacity duration-700 ease-out motion-reduce:transition-none"
				[class]="isLoaded() ? 'opacity-100' : 'opacity-0'"
			>
				<img
					[src]="backdrop | coverUrl: 640"
					alt=""
					class="absolute inset-0 w-full h-full object-cover scale-125 blur-3xl opacity-60 saturate-150"
				/>
				<img
					[src]="backdrop"
					alt=""
					fetchpriority="high"
					class="absolute inset-0 w-full h-full object-cover opacity-55 [mask-image:linear-gradient(to_bottom,black_20%,transparent_90%)]"
					(load)="loadedUrl.set(backdrop)"
				/>
			</div>
		}
		<div
			class="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/70 to-canvas/0"
		></div>
		<div
			class="absolute inset-0 bg-gradient-to-r from-canvas/70 via-transparent to-transparent"
		></div>
	`,
	host: { class: "block", "aria-hidden": "true" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileBackdrop {
	readonly url = input<string | null>(null);

	protected readonly loadedUrl = signal<string | null>(null);
	protected readonly isLoaded = computed(
		() => this.loadedUrl() === this.url()
	);
}
