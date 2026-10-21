export function moveIntoFullOrder(
	fullOrder: readonly string[],
	movedId: string,
	visibleOrder: readonly string[]
): string[] {
	const known = new Set(fullOrder);
	const visible = visibleOrder.filter(id => known.has(id));
	const visibleIndex = visible.indexOf(movedId);
	if (visibleIndex === -1) return [...fullOrder];

	const order = fullOrder.filter(id => id !== movedId);
	const next = visible[visibleIndex + 1];
	const previous = visible[visibleIndex - 1];
	if (next !== undefined) {
		order.splice(order.indexOf(next), 0, movedId);
	} else if (previous !== undefined) {
		order.splice(order.indexOf(previous) + 1, 0, movedId);
	} else {
		return [...fullOrder];
	}
	return order;
}

export function arrangeIntoFullOrder(
	fullOrder: readonly string[],
	visibleOrder: readonly string[]
): string[] {
	const known = new Set(fullOrder);
	const arranged = visibleOrder.filter(id => known.has(id));
	const arrangedIds = new Set(arranged);
	let slot = 0;
	return fullOrder.map(id => (arrangedIds.has(id) ? arranged[slot++] : id));
}
