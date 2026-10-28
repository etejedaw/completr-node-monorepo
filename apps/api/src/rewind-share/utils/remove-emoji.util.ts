// Matches pictographic emoji plus their joiners, variation selectors and regional-indicator flags: "Hades 🔥🇨🇱" -> "Hades "
const EMOJI_PATTERN =
	/\p{Extended_Pictographic}|\u{FE0F}|\u{200D}|[\u{1F1E6}-\u{1F1FF}]/gu;
const REPEATED_WHITESPACE = /\s+/g;

export function removeEmoji(text: string): string {
	return text
		.replace(EMOJI_PATTERN, "")
		.replace(REPEATED_WHITESPACE, " ")
		.trim();
}
