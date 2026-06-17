import {
	ChangeDetectionStrategy,
	Component,
	output,
	signal
} from "@angular/core";

interface Step {
	icon: string;
	title: string;
	body: string;
}

@Component({
	selector: "app-onboarding-tour",
	standalone: true,
	template: `
		<div class="modal-overlay" (click)="skip.emit()">
			<div
				class="bg-sidebar border border-line rounded-[12px] p-7 w-full max-w-[480px] flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
				style="box-shadow: 0 20px 60px -12px rgba(0, 0, 0, 0.6);"
				(click)="$event.stopPropagation()"
			>
				@let step = steps[index()];
				<div class="flex items-center gap-3">
					<span class="flex items-center justify-center w-10 h-10 rounded-full bg-brand-subtle text-brand">
						<span class="material-icons">{{ step.icon }}</span>
					</span>
					<div>
						<span class="block text-[0.625rem] font-semibold uppercase tracking-wider text-fg-muted">Step {{ index() + 1 }} of {{ steps.length }}</span>
						<h2 class="font-display m-0 text-lg font-bold">{{ step.title }}</h2>
					</div>
				</div>

				<p class="text-sm text-fg-secondary leading-relaxed whitespace-pre-line m-0">{{ step.body }}</p>

				<div class="flex items-center justify-center gap-1.5">
					@for (_ of steps; track $index) {
						<span
							class="block w-2 h-2 rounded-full transition"
							[class.bg-brand]="$index === index()"
							[class.bg-line]="$index !== index()"
						></span>
					}
				</div>

				<div class="flex items-center justify-between gap-2 pt-2 border-t border-line">
					<button
						type="button"
						class="bg-transparent border-0 text-fg-muted text-sm font-medium px-2 py-1.5 cursor-pointer transition hover:text-fg"
						(click)="skip.emit()"
					>
						Skip
					</button>
					<div class="flex items-center gap-2">
						@if (index() > 0) {
							<button
								type="button"
								class="bg-input-bg border border-line rounded text-fg-secondary text-sm font-semibold px-4 py-2 cursor-pointer transition hover:border-brand hover:text-brand"
								(click)="prev()"
							>
								Back
							</button>
						}
						@if (index() < steps.length - 1) {
							<button
								type="button"
								class="text-white border-0 rounded text-sm font-semibold px-4 py-2 cursor-pointer transition hover:opacity-90"
								style="background: linear-gradient(135deg, var(--color-brand), var(--color-brand-deep));"
								(click)="next()"
							>
								Next
							</button>
						} @else {
							<button
								type="button"
								class="text-white border-0 rounded text-sm font-semibold px-4 py-2 cursor-pointer transition hover:opacity-90"
								style="background: linear-gradient(135deg, var(--color-brand), var(--color-brand-deep));"
								(click)="done.emit()"
							>
								Got it
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
			icon: "celebration",
			title: "Welcome to Completr",
			body: "Track every game you play, want to play, or own. Share what you're into, see what your friends are playing, and never lose track of your backlog again."
		},
		{
			icon: "list_alt",
			title: "Library — your stuff",
			body: "My Games is your full history: every title you want to play, are playing, completed, dropped, or play endlessly.\nUp Next is your priority queue — what to play right now.\nMy Shelf is what you own (physical or digital).\nWant to Get is your wishlist."
		},
		{
			icon: "explore",
			title: "Discover — find your next",
			body: "Browse the full catalog, follow curated Lists from other players, and find Users with similar taste. Your Feed shows what people you follow are playing."
		}
	];

	done = output<void>();
	skip = output<void>();

	next() {
		this.index.update(i => Math.min(i + 1, this.steps.length - 1));
	}

	prev() {
		this.index.update(i => Math.max(i - 1, 0));
	}
}
