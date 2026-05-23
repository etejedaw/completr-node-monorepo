export function metascoreColorClass(score: number | null | undefined): string {
	if (score == null) return "text-fg-muted";
	if (score >= 75) return "text-success";
	if (score >= 50) return "text-warning";
	return "text-danger";
}
