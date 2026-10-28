import { removeEmoji } from "./remove-emoji.util";
import { truncateText } from "./truncate-text.util";

export function displayText(text: string, maxLength: number): string {
	return truncateText(removeEmoji(text), maxLength);
}
