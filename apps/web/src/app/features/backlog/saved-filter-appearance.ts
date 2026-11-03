export const SAVED_FILTER_ICONS = [
	"bookmark",
	"star",
	"favorite",
	"sports_esports",
	"smartphone",
	"computer",
	"tv",
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

export const SAVED_FILTER_ICON_LABELS: Record<string, string> = {
	bookmark: "Bookmark",
	star: "Star",
	favorite: "Heart",
	sports_esports: "Gamepad",
	smartphone: "Phone",
	computer: "PC",
	tv: "TV",
	emoji_events: "Trophy",
	flag: "Flag",
	check_circle: "Check",
	schedule: "Clock",
	bolt: "Bolt",
	local_fire_department: "Fire",
	filter_alt: "Filter",
	list: "List",
	calendar_month: "Calendar",
	military_tech: "Medal",
	rocket_launch: "Rocket",
	visibility: "Eye"
};

export function savedFilterIconLabel(icon: string) {
	return SAVED_FILTER_ICON_LABELS[icon] ?? icon;
}

export const SAVED_FILTER_COLORS: {
	key: string;
	hex: string;
	label: string;
}[] = [
	{ key: "brand", hex: "var(--color-brand)", label: "Theme color" },
	{ key: "sky", hex: "#38bdf8", label: "Sky blue" },
	{ key: "emerald", hex: "#34d399", label: "Green" },
	{ key: "rose", hex: "#fb7185", label: "Pink" },
	{ key: "purple", hex: "#a78bfa", label: "Purple" },
	{ key: "teal", hex: "#2dd4bf", label: "Teal" },
	{ key: "slate", hex: "#94a3b8", label: "Gray" }
];

export function savedFilterColorHex(color: string | null | undefined) {
	if (!color) return null;
	return SAVED_FILTER_COLORS.find(c => c.key === color)?.hex ?? null;
}

export function supportedSavedFilterColor(color: string | null | undefined) {
	return SAVED_FILTER_COLORS.find(c => c.key === color)?.key ?? null;
}
