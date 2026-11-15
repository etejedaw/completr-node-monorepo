export function mostUsedRating(ratings: number[]): number | null {
	const counts = new Map<number, number>();
	for (const rating of ratings)
		counts.set(rating, (counts.get(rating) ?? 0) + 1);
	const [top] = [...counts.entries()].sort(
		(first, second) => second[1] - first[1] || second[0] - first[0]
	);
	return top ? top[0] : null;
}
