import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
	signal
} from "@angular/core";
import { getRatingLabel } from "../../constants/rating-labels";

type StarState = "empty" | "half" | "full";

@Component({
	selector: "app-star-rating",
	templateUrl: "./star-rating.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class StarRating {
	value = input<number | null>(null);
	readonly = input(false);
	size = input<"sm" | "md">("md");
	ariaLabelledby = input<string | null>(null);
	ratingChange = output<number | null>();

	protected readonly stars: readonly number[] = [1, 2, 3, 4, 5];
	protected readonly hoverValue = signal<number | null>(null);
	protected readonly displayValue = computed(
		() => this.hoverValue() ?? this.value() ?? 0
	);
	protected readonly label = computed(() =>
		getRatingLabel(this.hoverValue() ?? this.value())
	);
	protected readonly ariaValueText = computed(() => {
		const v = this.value();
		if (v == null) return "no rating";
		const l = getRatingLabel(v);
		return l ? `${v} out of 5 — ${l}` : `${v} out of 5`;
	});

	protected readonly wrapperClasses = computed(() => {
		const dims = this.size() === "sm" ? "w-4 h-4" : "w-6 h-6";
		const cursor = this.readonly() ? "cursor-default" : "cursor-pointer";
		return `relative inline-block shrink-0 ${dims} ${cursor}`;
	});

	protected readonly listGap = computed(() =>
		this.size() === "sm" ? "gap-0.5" : "gap-1"
	);

	protected starState(star: number): StarState {
		const val = this.displayValue();
		if (val >= star) return "full";
		if (val >= star - 0.5) return "half";
		return "empty";
	}

	protected iconClasses(star: number): string {
		const sizeText = this.size() === "sm" ? "text-base" : "text-2xl";
		const state = this.starState(star);
		let color = "";
		if (state === "full") color = "text-warning";
		else if (state === "empty") color = "text-fg-muted/40";
		return `absolute inset-0 flex items-center justify-center pointer-events-none transition-colors leading-none ${sizeText} ${color}`;
	}

	protected isHalf(star: number): boolean {
		return this.starState(star) === "half";
	}

	protected onHalf(star: number) {
		this.hoverValue.set(star - 0.5);
	}

	protected onFull(star: number) {
		this.hoverValue.set(star);
	}

	protected onLeave() {
		this.hoverValue.set(null);
	}

	protected onClick(value: number) {
		if (this.value() === value) {
			this.ratingChange.emit(null);
		} else {
			this.ratingChange.emit(value);
		}
	}

	protected onKey(event: KeyboardEvent) {
		if (this.readonly()) return;
		const current = this.value() ?? 0;
		const step = 0.5;
		switch (event.key) {
			case "ArrowRight":
			case "ArrowUp":
				event.preventDefault();
				this.ratingChange.emit(Math.min(5, current + step));
				return;
			case "ArrowLeft":
			case "ArrowDown":
				event.preventDefault();
				this.ratingChange.emit(Math.max(0, current - step));
				return;
			case "Home":
				event.preventDefault();
				this.ratingChange.emit(0.5);
				return;
			case "End":
				event.preventDefault();
				this.ratingChange.emit(5);
				return;
			case "Delete":
			case "Backspace":
				event.preventDefault();
				this.ratingChange.emit(null);
				return;
		}
	}
}
