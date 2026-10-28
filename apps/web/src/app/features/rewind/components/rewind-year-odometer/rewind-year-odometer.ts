import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import { REWIND_YEAR_FILL_CLASS } from "../../rewind-tone";

export interface OdometerReel {
	key: string;
	digits: number[];
	fillPosition: string;
	delayMs: number;
}

export const ODOMETER_STAGGER_MS = 90;
const DIGITS_PER_TURN = 10;

function rollDigits(from: number, to: number): number[] {
	const steps =
		DIGITS_PER_TURN + ((to - from + DIGITS_PER_TURN) % DIGITS_PER_TURN);
	return Array.from(
		{ length: steps + 1 },
		(_, step) => (from + step) % DIGITS_PER_TURN
	);
}

export function odometerReels(year: number): OdometerReel[] {
	const target = String(year);
	const previous = String(year - 1).padStart(target.length, "0");
	const lastIndex = Math.max(1, target.length - 1);
	return [...target].map((digit, index) => ({
		key: `${year}-${index}`,
		digits: rollDigits(Number(previous[index]), Number(digit)),
		fillPosition: `${(index / lastIndex) * 100}%`,
		delayMs: index * ODOMETER_STAGGER_MS
	}));
}

@Component({
	selector: "app-rewind-year-odometer",
	template: `
		@for (reel of reels(); track reel.key) {
			<span class="block h-[1em] overflow-hidden">
				<span
					class="flex flex-col translate-y-[calc(var(--reel-steps)*-1em)] motion-safe:transition-[translate] motion-safe:duration-[1100ms] motion-safe:ease-[cubic-bezier(0.2,1.06,0.3,1)] motion-safe:starting:translate-y-0"
					[style.--reel-steps]="reel.digits.length - 1"
					[style.transition-delay.ms]="reel.delayMs"
				>
					@for (digit of reel.digits; track $index) {
						<span
							class="block h-[1em] leading-none [background-size:400%_100%]"
							[class]="fillClass"
							[style.background-position-x]="reel.fillPosition"
							>{{ digit }}</span
						>
					}
				</span>
			</span>
		}
	`,
	host: { class: "inline-flex tabular-nums", "aria-hidden": "true" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewindYearOdometer {
	readonly year = input.required<number>();

	protected readonly fillClass = REWIND_YEAR_FILL_CLASS;
	protected readonly reels = computed(() => odometerReels(this.year()));
}
