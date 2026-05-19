import { ChangeDetectionStrategy, Component, computed, input, output } from "@angular/core";

@Component({
	selector: "ui-pagination",
	templateUrl: "./ui-pagination.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiPagination {
	offset = input.required<number>();
	limit = input.required<number>();
	total = input.required<number>();

	offsetChange = output<number>();

	protected readonly start = computed(() => this.offset() + 1);
	protected readonly end = computed(() =>
		Math.min(this.offset() + this.limit(), this.total())
	);
	protected readonly hasPrev = computed(() => this.offset() > 0);
	protected readonly hasNext = computed(
		() => this.offset() + this.limit() < this.total()
	);

	prev() {
		const next = Math.max(0, this.offset() - this.limit());
		this.offsetChange.emit(next);
	}

	next() {
		this.offsetChange.emit(this.offset() + this.limit());
	}
}
