import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";

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
	protected readonly totalPages = computed(() =>
		Math.max(1, Math.ceil(this.total() / this.limit()))
	);
	protected readonly currentPage = computed(
		() => Math.floor(this.offset() / this.limit()) + 1
	);
	protected readonly pages = computed<(number | "...")[]>(() => {
		const total = this.totalPages();
		const current = this.currentPage();
		if (total <= 7) {
			return Array.from({ length: total }, (_, i) => i + 1);
		}

		const out: (number | "...")[] = [1];
		const window = [current - 1, current, current + 1].filter(
			p => p > 1 && p < total
		);
		if (window[0]! > 2) out.push("...");
		out.push(...window);
		if (window[window.length - 1]! < total - 1) out.push("...");
		out.push(total);
		return out;
	});

	prev() {
		this.goToPage(this.currentPage() - 1);
	}

	next() {
		this.goToPage(this.currentPage() + 1);
	}

	first() {
		this.goToPage(1);
	}

	last() {
		this.goToPage(this.totalPages());
	}

	goToPage(page: number) {
		const clamped = Math.max(1, Math.min(this.totalPages(), page));
		if (clamped === this.currentPage()) return;
		this.offsetChange.emit((clamped - 1) * this.limit());
	}
}
