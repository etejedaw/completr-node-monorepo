import { type RewindPersonaCode } from "../../rewind/rewind.interface";
import { SHARE_COLORS, SHARE_FONT_FAMILY } from "../rewind-share.constants";
import { type ShareCopy } from "../rewind-share.interface";
import { box, diamond, type SatoriElement, text } from "./elements.template";

export interface PersonaBadgeSizes {
	titleSize: number;
	phraseSize: number;
}

const BADGE_GRADIENT = `linear-gradient(110deg, #6d28d9 0%, ${SHARE_COLORS.brand} 55%, #c026d3 100%)`;

function badge(title: string, titleSize: number): SatoriElement {
	return box(
		{
			alignItems: "center",
			alignSelf: "flex-start",
			gap: titleSize * 0.36,
			padding: `${titleSize * 0.2}px ${titleSize * 0.46}px ${titleSize * 0.22}px ${titleSize * 0.36}px`,
			backgroundImage: BADGE_GRADIENT,
			borderRadius: titleSize * 0.12,
			transform: "skewX(-10deg)",
			boxShadow: `0 ${titleSize * 0.24}px ${titleSize * 0.6}px rgba(109, 40, 217, 0.55)`
		},
		[
			diamond(titleSize * 0.4, SHARE_COLORS.foreground),
			text(
				{
					fontFamily: SHARE_FONT_FAMILY.display,
					fontWeight: 700,
					fontSize: titleSize,
					lineHeight: 1,
					color: "#ffffff"
				},
				title
			)
		]
	);
}

export function personaBadge(
	persona: RewindPersonaCode,
	copy: ShareCopy,
	sizes: PersonaBadgeSizes
): SatoriElement {
	const { title, phrase } = copy.personas[persona];
	return box({ flexDirection: "column", gap: sizes.phraseSize * 0.55 }, [
		badge(title, sizes.titleSize),
		text(
			{
				fontFamily: SHARE_FONT_FAMILY.text,
				fontWeight: 600,
				fontSize: sizes.phraseSize,
				lineHeight: 1.3,
				color: SHARE_COLORS.secondary
			},
			phrase
		)
	]);
}
