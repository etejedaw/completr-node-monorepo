import { type Signal } from "@angular/core";

export interface RowSelection<T> {
	readonly selectedIds: Signal<ReadonlySet<string>>;
	readonly selectedRows: Signal<readonly T[]>;
	readonly count: Signal<number>;
	readonly isAllSelected: Signal<boolean>;
	readonly isPartiallySelected: Signal<boolean>;
	isSelected(id: string): boolean;
	toggle(id: string): void;
	toggleRange(id: string): void;
	togglePage(): void;
	select(ids: Iterable<string>): void;
	clear(): void;
}
