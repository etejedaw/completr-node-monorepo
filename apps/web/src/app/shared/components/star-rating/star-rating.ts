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
	ratingChange = output<number | null>();

	protected readonly stars: readonly number[] = [1, 2, 3, 4, 5];
	protected readonly hoverValue = signal<number | null>(null);
	protected readonly displayValue = computed(
		() => this.hoverValue() ?? this.value() ?? 0
	);
	protected readonly label = computed(() =>
		getRatingLabel(this.hoverValue() ?? this.value())
	);

	protected starState(star: number): StarState {
		const val = this.displayValue();
		if (val >= star) return "full";
		if (val >= star - 0.5) return "half";
		return "empty";
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
