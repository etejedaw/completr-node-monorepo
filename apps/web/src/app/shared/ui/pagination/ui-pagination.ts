import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output
} from "@angular/core";
import {
	NgpPagination,
	NgpPaginationButton,
	NgpPaginationFirst,
	NgpPaginationLast,
	NgpPaginationNext,
	NgpPaginationPrevious
} from "ng-primitives/pagination";

@Component({
	selector: "ui-pagination",
	imports: [
		NgpPagination,
		NgpPaginationButton,
		NgpPaginationFirst,
		NgpPaginationLast,
		NgpPaginationNext,
		NgpPaginationPrevious
	],
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

	protected onPageChange(page: number) {
		const clamped = Math.max(1, Math.min(this.totalPages(), page));
		if (clamped === this.currentPage()) return;
		this.offsetChange.emit((clamped - 1) * this.limit());
	}
}
