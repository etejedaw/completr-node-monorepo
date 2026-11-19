import { DEFAULT_TAG_COLOR, DEFAULT_TAG_ICON } from "../constants/mood-tags";
import { appearanceColorHex } from "./appearance";

export function tagIconOf(icon: string | null | undefined) {
	return icon || DEFAULT_TAG_ICON;
}

export function tagColorOf(color: string | null | undefined) {
	return appearanceColorHex(color) ?? DEFAULT_TAG_COLOR;
}
