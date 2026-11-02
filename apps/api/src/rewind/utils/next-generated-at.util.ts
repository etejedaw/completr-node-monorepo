export function nextGeneratedAt(previous: Date | null, now: Date): Date {
	if (previous && now.getTime() <= previous.getTime())
		return new Date(previous.getTime() + 1);
	return now;
}
