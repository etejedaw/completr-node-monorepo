export const RATING_LABELS: Record<number, string> = {
	0.5: "Unplayable",
	1: "Trash",
	1.5: "Painful",
	2: "Meh",
	2.5: "Mid",
	3: "Solid",
	3.5: "Fun",
	4: "Banger",
	4.5: "Peak",
	5: "GOAT"
};

export function getRatingLabel(value: number | null): string {
	if (!value) return "";
	const nearest = Math.round(value * 2) / 2;
	return RATING_LABELS[nearest] ?? "";
}
