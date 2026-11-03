import { computed, linkedSignal, type Signal } from "@angular/core";

import { type RowSelection } from "./row-selection.model";

function sameIds(a: readonly string[], b: readonly string[]): boolean {
	return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function injectRowSelection<T>(
	rows: Signal<readonly T[]>,
	idOf: (row: T) => string
): RowSelection<T> {
	const rowIds = computed(() => rows().map(idOf), { equal: sameIds });
	const selectedIds = linkedSignal<readonly string[], ReadonlySet<string>>({
		source: rowIds,
		computation: () => new Set()
	});
	const anchorId = linkedSignal<readonly string[], string | null>({
		source: rowIds,
		computation: () => null
	});

	const count = computed(() => selectedIds().size);
	const selectedRows = computed(() => {
		const selected = selectedIds();
		return rows().filter(row => selected.has(idOf(row)));
	});
	const isAllSelected = computed(
		() => rowIds().length > 0 && count() === rowIds().length
	);
	const isPartiallySelected = computed(() => count() > 0 && !isAllSelected());

	function setSelected(ids: Iterable<string>, selected: boolean) {
		const next = new Set(selectedIds());
		for (const id of ids) {
			if (selected) next.add(id);
			else next.delete(id);
		}
		selectedIds.set(next);
	}

	function toggle(id: string) {
		if (!rowIds().includes(id)) return;
		setSelected([id], !selectedIds().has(id));
		anchorId.set(id);
	}

	function toggleRange(id: string) {
		const ids = rowIds();
		const anchor = anchorId();
		const anchorIndex = anchor === null ? -1 : ids.indexOf(anchor);
		const targetIndex = ids.indexOf(id);
		if (targetIndex === -1) return;
		if (anchorIndex === -1) {
			toggle(id);
			return;
		}
		const [start, end] =
			anchorIndex < targetIndex
				? [anchorIndex, targetIndex]
				: [targetIndex, anchorIndex];
		setSelected(ids.slice(start, end + 1), !selectedIds().has(id));
		anchorId.set(id);
	}

	function togglePage() {
		if (isAllSelected()) {
			clear();
			return;
		}
		selectedIds.set(new Set(rowIds()));
	}

	function select(ids: Iterable<string>) {
		const visible = new Set(rowIds());
		selectedIds.set(new Set([...ids].filter(id => visible.has(id))));
	}

	function clear() {
		selectedIds.set(new Set());
		anchorId.set(null);
	}

	return {
		selectedIds: selectedIds.asReadonly(),
		selectedRows,
		count,
		isAllSelected,
		isPartiallySelected,
		isSelected: (id: string) => selectedIds().has(id),
		toggle,
		toggleRange,
		togglePage,
		select,
		clear
	};
}
