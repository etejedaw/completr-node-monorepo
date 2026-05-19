import {
	ChangeDetectionStrategy,
	Component,
	input,
	output,
	signal
} from "@angular/core";
import { getRatingLabel } from "../../constants/rating-labels";

@Component({
	selector: "app-star-rating",
	templateUrl: "./star-rating.html",
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: [
		`
			.star.empty .star-icon {
				color: var(--color-line-hover);
			}
			.star.full .star-icon {
				color: var(--color-warning);
			}
			.star.half .star-icon {
				background: linear-gradient(
					90deg,
					var(--color-warning) 50%,
					var(--color-line-hover) 50%
				);
				-webkit-background-clip: text;
				background-clip: text;
				-webkit-text-fill-color: transparent;
			}
		`
	]
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
		return getRatingLabel(v);
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
