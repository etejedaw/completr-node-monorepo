export type UiTone = "brand" | "danger" | "warning" | "success" | "premium";

export const UI_TONE_COLOR: Record<UiTone, string> = {
	brand: "var(--color-brand)",
	danger: "var(--color-danger)",
	warning: "var(--color-warning)",
	success: "var(--color-success)",
	premium: "var(--color-premium)"
};

export const UI_TONE_ICON_CLASS: Record<UiTone, string> = {
	brand: "bg-brand/12 text-brand ring-brand/25",
	danger: "bg-danger/12 text-danger ring-danger/25",
	warning: "bg-warning/12 text-warning ring-warning/25",
	success: "bg-success/12 text-success ring-success/25",
	premium: "bg-premium/12 text-premium ring-premium/25"
};

export const UI_TONE_HALO_CLASS =
	"bg-[radial-gradient(120%_140%_at_0%_0%,color-mix(in_srgb,var(--ui-tone)_12%,transparent),transparent_60%)]";
