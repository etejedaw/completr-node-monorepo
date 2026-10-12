import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	inject,
	input,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { type Game } from "../../../../core/models";

const ROTATION_INTERVAL_MS = 7000;

@Component({
	selector: "app-browse-hero",
	imports: [RouterLink],
	templateUrl: "./browse-hero.html",
	host: {
		class: "block",
		"(mouseenter)": "hovered.set(true)",
		"(mouseleave)": "hovered.set(false)",
		"(focusin)": "focused.set(true)",
		"(focusout)": "focused.set(false)"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrowseHero {
	readonly games = input.required<Game[]>();

	protected readonly index = signal(0);
	protected readonly paused = signal(false);
	protected readonly hovered = signal(false);
	protected readonly focused = signal(false);
	private readonly reducedMotion = signal(false);

	protected readonly current = computed(() => {
		const games = this.games();
		return games.length > 0 ? games[this.index() % games.length] : null;
	});
	protected readonly rotating = computed(
		() =>
			this.games().length > 1 &&
			!this.paused() &&
			!this.hovered() &&
			!this.focused() &&
			!this.reducedMotion()
	);

	constructor() {
		const destroyRef = inject(DestroyRef);
		afterNextRender(() => {
			const motionQuery = window.matchMedia(
				"(prefers-reduced-motion: reduce)"
			);
			this.reducedMotion.set(motionQuery.matches);
			const timer = window.setInterval(() => {
				if (this.rotating()) this.step(1);
			}, ROTATION_INTERVAL_MS);
			destroyRef.onDestroy(() => window.clearInterval(timer));
		});
	}

	protected step(direction: 1 | -1): void {
		const total = this.games().length;
		if (total === 0) return;
		this.index.update(i => (i + direction + total) % total);
	}

	protected select(index: number): void {
		this.index.set(index);
	}

	protected togglePaused(): void {
		this.paused.update(paused => !paused);
	}
}
