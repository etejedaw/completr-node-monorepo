import {
	type Rewind,
	type RewindRatedGame
} from "../../rewind/rewind.interface";
import { SHARE_COLORS, SHARE_FONT_FAMILY } from "../rewind-share.constants";
import { type ShareCover } from "../rewind-share.interface";
import { displayText } from "../utils/display-text.util";
import { box, diamond, type SatoriElement, text } from "./elements.template";

const FEATURED_TITLE_MAX_LENGTH = 30;

function leadingTopRated(
	rewind: Rewind,
	covers: ShareCover[]
): RewindRatedGame | null {
	const topRated = rewind.highlights.topRated;
	return topRated && covers[0]?.gameId === topRated.gameId ? topRated : null;
}

function featuredCaption(
	topRated: RewindRatedGame,
	fontSize: number
): SatoriElement {
	return box(
		{
			alignItems: "center",
			justifyContent: "center",
			gap: fontSize * 0.45
		},
		[
			diamond(fontSize * 0.5, SHARE_COLORS.brandLight),
			text(
				{
					fontFamily: SHARE_FONT_FAMILY.text,
					fontWeight: 600,
					fontSize,
					color: SHARE_COLORS.muted
				},
				"Top rated"
			),
			text(
				{
					fontFamily: SHARE_FONT_FAMILY.display,
					fontWeight: 700,
					fontSize,
					color: SHARE_COLORS.foreground
				},
				displayText(topRated.title, FEATURED_TITLE_MAX_LENGTH)
			)
		]
	);
}

export function fanWithCaption(
	rewind: Rewind,
	covers: ShareCover[],
	fan: SatoriElement,
	captionSize: number
): SatoriElement[] {
	const topRated = leadingTopRated(rewind, covers);
	return topRated ? [fan, featuredCaption(topRated, captionSize)] : [fan];
}
