import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	DOCUMENT,
	inject,
	input,
	signal
} from "@angular/core";

import { InView } from "../../../../shared/directives/in-view";
import { formatHours } from "../../rewind-copy";

export type RewindTallyTone =
	"success" | "danger" | "playing" | "platinum" | "neutral";

export interface RewindTallyRow {
	label: string;
	value: number;
	tone: RewindTallyTone;
}

export const TALLY_DURATION_MS = 900;
export const TALLY_STAGGER_MS = 80;

const TONE_CLASS: Record<RewindTallyTone, string> = {
	success: "text-success",
	danger: "text-danger",
	playing: "text-playing",
	platinum: "text-platinum",
	neutral: "text-fg"
};

function easeOutCubic(progress: number): number {
	return 1 - Math.pow(1 - progress, 3);
}

function countedValue(target: number, progress: number): number {
	const eased = target * easeOutCubic(progress);
	return Number.isInteger(target)
		? Math.round(eased)
		: Math.round(eased * 10) / 10;
}

@Component({
	selector: "app-rewind-tally",
	imports: [InView],
	template: `
		<dl
			class="m-0 flex flex-col"
			appInView
			(inViewChange)="$event && start()"
		>
			@for (row of rows(); track row.label; let i = $index) {
				<div
					class="flex items-baseline gap-3 py-3 sm:py-3.5 border-b border-line last:border-b-0"
				>
					<dt
						class="flex-1 min-w-0 flex items-baseline gap-3 text-sm sm:text-base text-fg-secondary"
					>
						<span class="shrink-0">{{ row.label }}</span>
						<span
							aria-hidden="true"
							class="flex-1 min-w-4 border-b-2 border-dotted border-line-hover"
						></span>
					</dt>
					<dd
						class="m-0 shrink-0 font-display text-3xl sm:text-4xl font-semibold leading-none tabular-nums"
						[class]="toneClass(row.tone)"
					>
						<span aria-hidden="true">{{
							displayValue(row, i)
						}}</span>
						<span class="sr-only">{{ format(row.value) }}</span>
					</dd>
				</div>
			}
		</dl>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindTally {
	readonly rows = input.required<RewindTallyRow[]>();

	private readonly window = inject(DOCUMENT).defaultView;
	private readonly elapsed = signal<number | null>(null);
	private readonly animates = this.canAnimate();
	private frameId: number | null = null;
	private hasStarted = false;

	private readonly totalDuration = computed(
		() => TALLY_DURATION_MS + TALLY_STAGGER_MS * (this.rows().length - 1)
	);

	constructor() {
		inject(DestroyRef).onDestroy(() => this.stopFrames());
	}

	protected start() {
		if (this.hasStarted || !this.animates) return;
		this.hasStarted = true;
		const startedAt = this.window!.performance.now();
		this.elapsed.set(0);
		const tick = (now: number) => {
			const elapsed = now - startedAt;
			this.elapsed.set(elapsed);
			this.frameId =
				elapsed < this.totalDuration()
					? this.window!.requestAnimationFrame(tick)
					: null;
		};
		this.frameId = this.window!.requestAnimationFrame(tick);
	}

	protected displayValue(row: RewindTallyRow, index: number): string {
		const elapsed = this.elapsed();
		if (elapsed === null) {
			return this.animates ? "0" : this.format(row.value);
		}
		const local = (elapsed - index * TALLY_STAGGER_MS) / TALLY_DURATION_MS;
		const progress = Math.min(1, Math.max(0, local));
		return this.format(countedValue(row.value, progress));
	}

	protected format(value: number): string {
		return formatHours(value);
	}

	protected toneClass(tone: RewindTallyTone): string {
		return TONE_CLASS[tone];
	}

	private canAnimate(): boolean {
		const win = this.window;
		if (!win?.requestAnimationFrame || !win.matchMedia) return false;
		if (typeof IntersectionObserver === "undefined") return false;
		return !win.matchMedia("(prefers-reduced-motion: reduce)").matches;
	}

	private stopFrames() {
		if (this.frameId !== null)
			this.window?.cancelAnimationFrame(this.frameId);
		this.frameId = null;
	}
}
