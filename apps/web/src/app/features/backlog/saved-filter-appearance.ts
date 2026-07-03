export const SAVED_FILTER_ICONS = [
	"bookmark",
	"star",
	"favorite",
	"sports_esports",
	"emoji_events",
	"flag",
	"check_circle",
	"schedule",
	"bolt",
	"local_fire_department",
	"filter_alt",
	"list",
	"calendar_month",
	"military_tech",
	"rocket_launch",
	"visibility"
];

export const SAVED_FILTER_COLORS: { key: string; hex: string }[] = [
	{ key: "brand", hex: "var(--color-brand)" },
	{ key: "sky", hex: "#38bdf8" },
	{ key: "emerald", hex: "#34d399" },
	{ key: "amber", hex: "#fbbf24" },
	{ key: "rose", hex: "#fb7185" },
	{ key: "purple", hex: "#a78bfa" },
	{ key: "teal", hex: "#2dd4bf" },
	{ key: "slate", hex: "#94a3b8" }
];

export function savedFilterColorHex(color: string | null | undefined) {
	if (!color) return null;
	return SAVED_FILTER_COLORS.find(c => c.key === color)?.hex ?? null;
}
