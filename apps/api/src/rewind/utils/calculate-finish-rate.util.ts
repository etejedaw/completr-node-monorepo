export function calculateFinishRate(
	finished: number,
	abandoned: number
): number | null {
	const closed = finished + abandoned;
	if (closed === 0) return null;
	return Math.round((finished / closed) * 100);
}
