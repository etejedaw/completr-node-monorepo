import {
	ChangeDetectionStrategy,
	Component,
	input,
	output,
	signal
} from "@angular/core";

const RATING_LABELS: Record<number, string> = {
	0.5: "Unplayable",
	1: "Trash",
	1.5: "Painful",
	2: "Meh",
	2.5: "Mid",
	3: "Solid",
	3.5: "Fun",
	4: "Banger",
	4.5: "Peak",
	5: "GOAT"
};

@Component({
	selector: "app-star-rating",
	templateUrl: "./star-rating.html",
	styleUrl: "./star-rating.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class StarRating {
	value = input<number | null>(null);
	readonly = input(false);
	size = input<"sm" | "md">("md");
	ratingChange = output<number | null>();

	protected readonly hoverValue = signal<number | null>(null);
	protected readonly stars = [1, 2, 3, 4, 5];

	protected get displayValue(): number {
		return this.hoverValue() ?? this.value() ?? 0;
	}

	protected get label(): string {
		const v = this.hoverValue() ?? this.value();
		return v ? (RATING_LABELS[v] ?? "") : "";
	}

	protected getStarClass(star: number): string {
		const val = this.displayValue;
		if (val >= star) return "star full";
		if (val >= star - 0.5) return "star half";
		return "star empty";
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
}
