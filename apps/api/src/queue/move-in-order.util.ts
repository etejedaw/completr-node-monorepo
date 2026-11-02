export function moveInOrder(
	orderedIds: readonly string[],
	movedId: string,
	position: number
): string[] | null {
	if (!orderedIds.includes(movedId)) return null;
	const order = orderedIds.filter(id => id !== movedId);
	const targetIndex = Math.min(Math.max(position, 1), orderedIds.length) - 1;
	order.splice(targetIndex, 0, movedId);
	return order;
}
