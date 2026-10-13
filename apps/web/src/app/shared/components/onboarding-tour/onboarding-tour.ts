import {
	ChangeDetectionStrategy,
	Component,
	output,
	signal
} from "@angular/core";

import { NAV_SECTIONS, type NavItem } from "../../../layout/nav-sections";
import { UiButton, UiDialog } from "../../ui";

interface SectionItem {
	icon: string;
	name: string;
	hint: string;
	colorClass: string;
}

interface Step {
	heading: string;
	tagline: string;
	items: SectionItem[];
}

const NAV_ITEMS = new Map<string, NavItem>(
	NAV_SECTIONS.flatMap(section => section.items).map(item => [
		item.route,
		item
	])
);

function tourItem(route: string, hint: string): SectionItem {
	const nav = NAV_ITEMS.get(route);
	return {
		icon: nav?.icon ?? "circle",
		name: nav?.label ?? route,
		hint,
		colorClass: nav?.iconColorClass ?? "text-brand"
	};
}

@Component({
	selector: "app-onboarding-tour",
	imports: [UiButton, UiDialog],
	template: `
		@let step = steps[index()];
		<ui-dialog
			size="sm"
			[eyebrow]="
				'Welcome · Step ' + (index() + 1) + ' of ' + steps.length
			"
			[heading]="step.heading"
			[subheading]="step.tagline"
			(closed)="skip.emit()"
		>
			<div
				class="flex items-center gap-1.5 mb-4"
				role="progressbar"
				aria-label="Tour progress"
				[attr.aria-valuenow]="index() + 1"
				aria-valuemin="1"
				[attr.aria-valuemax]="steps.length"
			>
				@for (_ of steps; track $index) {
					<span
						class="block h-1.5 rounded-full transition-all motion-reduce:transition-none"
						[class]="
							$index === index()
								? 'w-6 bg-brand'
								: 'w-1.5 bg-line-hover'
						"
					></span>
				}
			</div>
			<ul class="list-none m-0 p-0 flex flex-col gap-1">
				@for (item of step.items; track item.name) {
					<li class="flex items-center gap-3 py-2">
						<span
							aria-hidden="true"
							class="flex items-center justify-center w-10 h-10 rounded-card bg-surface border border-line shrink-0"
						>
							<span
								class="material-icons text-[1.25rem]"
								[class]="item.colorClass"
								>{{ item.icon }}</span
							>
						</span>
						<span class="min-w-0">
							<span
								class="block text-sm font-semibold text-fg leading-tight"
								>{{ item.name }}</span
							>
							<span
								class="block text-[0.75rem] text-fg-muted leading-snug"
								>{{ item.hint }}</span
							>
						</span>
					</li>
				}
			</ul>

			<ng-container dialogFooter>
				@if (index() === steps.length - 1) {
					<button
						uiButton
						variant="ghost"
						type="button"
						class="mr-auto max-md:!basis-full"
						(click)="seeFullGuide.emit()"
					>
						<span
							aria-hidden="true"
							class="material-icons text-base"
							>menu_book</span
						>
						Read full guide
					</button>
				} @else {
					<button
						uiButton
						variant="ghost"
						type="button"
						class="mr-auto"
						(click)="skip.emit()"
					>
						Skip
					</button>
				}
				@if (index() > 0) {
					<button
						uiButton
						variant="secondary"
						type="button"
						(click)="prev()"
					>
						Back
					</button>
				}
				@if (index() < steps.length - 1) {
					<button
						uiButton
						variant="primary"
						type="button"
						(click)="next()"
					>
						Next
					</button>
				} @else {
					<button
						uiButton
						variant="primary"
						type="button"
						(click)="done.emit()"
					>
						Let's go
					</button>
				}
			</ng-container>
		</ui-dialog>
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
				tourItem(
					"/backlog",
					"Every game you've played, are playing, or want to play"
				),
				tourItem("/queue", "Your priority queue"),
				tourItem("/game-shelf", "What you own"),
				tourItem("/wishlist", "Wishlist for future buys")
			]
		},
		{
			heading: "Discover",
			tagline: "Find your next game",
			items: [
				tourItem("/games", "Full game catalog"),
				tourItem("/lists", "Curated picks"),
				tourItem("/feed", "What your friends are playing")
			]
		}
	];

	readonly done = output<void>();
	readonly skip = output<void>();
	readonly seeFullGuide = output<void>();

	next() {
		this.index.update(i => Math.min(i + 1, this.steps.length - 1));
	}

	prev() {
		this.index.update(i => Math.max(i - 1, 0));
	}
}
