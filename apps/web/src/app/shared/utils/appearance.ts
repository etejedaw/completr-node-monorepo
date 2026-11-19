import {
	APPEARANCE_COLORS,
	APPEARANCE_ICON_LABELS
} from "../constants/appearance";

export function appearanceIconLabel(icon: string) {
	return APPEARANCE_ICON_LABELS[icon] ?? icon;
}

export function appearanceColorHex(color: string | null | undefined) {
	if (!color) return null;
	return APPEARANCE_COLORS.find(c => c.key === color)?.hex ?? null;
}

export function supportedAppearanceColor(color: string | null | undefined) {
	return APPEARANCE_COLORS.find(c => c.key === color)?.key ?? null;
}
