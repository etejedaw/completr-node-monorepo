import {
	ChangeDetectionStrategy,
	Component,
	output,
	signal
} from "@angular/core";

interface SectionItem {
	icon: string;
	name: string;
	hint: string;
}

interface Step {
	heading: string;
	tagline: string;
	items: SectionItem[];
}

@Component({
	selector: "app-onboarding-tour",
	standalone: true,
	template: `
		<div class="modal-overlay" (click)="skip.emit()">
			<div
				class="bg-sidebar border border-line rounded-[16px] w-full max-w-[420px] flex flex-col max-h-[90vh] overflow-hidden"
				style="box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.7);"
				(click)="$event.stopPropagation()"
			>
				@let step = steps[index()];

				<div class="px-6 pt-6 pb-3">
					<div class="flex items-center justify-between mb-4">
						<div class="flex items-center gap-1.5">
							@for (_ of steps; track $index) {
								<span
									class="block h-1.5 rounded-full transition-all"
									[class.w-6]="$index === index()"
									[class.w-1.5]="$index !== index()"
									[class.bg-brand]="$index === index()"
									[class.bg-line]="$index !== index()"
								></span>
							}
						</div>
						<button
							type="button"
							class="bg-transparent border-0 text-fg-muted text-xs font-medium cursor-pointer transition hover:text-fg"
							(click)="skip.emit()"
						>
							Skip
						</button>
					</div>

					<h2 class="font-display m-0 text-xl font-bold text-fg leading-tight">{{ step.heading }}</h2>
					<p class="mt-1 mb-0 text-[0.8125rem] text-fg-muted">{{ step.tagline }}</p>
				</div>

				<div class="px-6 py-4 flex flex-col gap-2 overflow-y-auto">
					@for (item of step.items; track item.name) {
						<div class="flex items-center gap-3 py-2">
							<span class="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-subtle text-brand shrink-0">
								<span class="material-icons text-[1.125rem]">{{ item.icon }}</span>
							</span>
							<div class="min-w-0">
								<div class="text-sm font-semibold text-fg leading-tight">{{ item.name }}</div>
								<div class="text-[0.75rem] text-fg-muted leading-snug">{{ item.hint }}</div>
							</div>
						</div>
					}
				</div>

				<div class="px-6 py-4 border-t border-line flex items-center justify-between gap-2">
					@if (index() === steps.length - 1) {
						<button
							type="button"
							class="bg-transparent border-0 text-fg-muted text-xs font-medium cursor-pointer transition hover:text-brand inline-flex items-center gap-1"
							(click)="seeFullGuide.emit()"
						>
							<span class="material-icons text-sm">menu_book</span>
							Read full guide
						</button>
					} @else {
						<span></span>
					}
					<div class="flex items-center gap-2">
						@if (index() > 0) {
							<button
								type="button"
								class="bg-transparent border-0 text-fg-muted text-sm font-semibold px-3 py-2 cursor-pointer transition hover:text-fg"
								(click)="prev()"
							>
								Back
							</button>
						}
						@if (index() < steps.length - 1) {
							<button
								type="button"
								class="text-white border-0 rounded-lg text-sm font-semibold px-5 py-2 cursor-pointer transition hover:opacity-90"
								style="background: linear-gradient(135deg, var(--color-brand), var(--color-brand-deep));"
								(click)="next()"
							>
								Next
							</button>
						} @else {
							<button
								type="button"
								class="text-white border-0 rounded-lg text-sm font-semibold px-5 py-2 cursor-pointer transition hover:opacity-90"
								style="background: linear-gradient(135deg, var(--color-brand), var(--color-brand-deep));"
								(click)="done.emit()"
							>
								Let's go
							</button>
						}
					</div>
				</div>
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnboardingTour {
	protected readonly index = signal(0);
	protected readonly steps: Step[] = [
		{
			heading: "Your library",
			tagline: "Where your games live",
			items: [
				{
					icon: "list_alt",
					name: "My Games",
					hint: "Every game you've played, are playing, or want to play"
				},
				{
					icon: "playlist_play",
					name: "Up Next",
					hint: "Your priority queue"
				},
				{
					icon: "shelves",
					name: "My Shelf",
					hint: "What you own"
				},
				{
					icon: "favorite_border",
					name: "Want to Get",
					hint: "Wishlist for future buys"
				}
			]
		},
		{
			heading: "Discover",
			tagline: "Find your next game",
			items: [
				{
					icon: "sports_esports",
					name: "Browse",
					hint: "Full game catalog"
				},
				{
					icon: "format_list_bulleted",
					name: "Lists",
					hint: "Curated picks"
				},
				{
					icon: "dynamic_feed",
					name: "Feed",
					hint: "What your friends are playing"
				}
			]
		}
	];

	done = output<void>();
	skip = output<void>();
	seeFullGuide = output<void>();

	next() {
		this.index.update(i => Math.min(i + 1, this.steps.length - 1));
	}

	prev() {
		this.index.update(i => Math.max(i - 1, 0));
	}
}
