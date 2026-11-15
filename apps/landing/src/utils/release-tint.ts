const TINT_COLORS: Record<string, string> = {
	brand: "var(--color-brand)",
	purple: "var(--color-accent)",
	warning: "var(--color-warning)",
	success: "var(--color-success)",
	danger: "var(--color-danger)"
};

const TINT_BACKGROUND_PERCENT = 15;

export function releaseTintStyle(tint: string): string {
	const color = TINT_COLORS[tint];
	if (!color)
		return "background: var(--color-surface); color: var(--color-fg-secondary);";
	return `background: color-mix(in srgb, ${color} ${TINT_BACKGROUND_PERCENT}%, transparent); color: ${color};`;
}
