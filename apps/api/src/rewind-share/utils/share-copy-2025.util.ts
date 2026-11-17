import { type RewindLanguage } from "../../rewind/rewind.constants";
import { type Share2025Copy } from "../rewind-share.interface";

const SHARE_2025_COPIES: Record<RewindLanguage, Share2025Copy> = {
	en: {
		eyebrow: username => `@${username}'s Rewind`,
		tally: {
			finished: "Finished",
			leftBehind: "Left behind",
			hoursPlayed: "Hours played",
			averageRating: "Average rating"
		}
	},
	es: {
		eyebrow: username => `Rewind de @${username}`,
		tally: {
			finished: "Terminados",
			leftBehind: "Abandonados",
			hoursPlayed: "Horas jugadas",
			averageRating: "Nota promedio"
		}
	}
};

export function shareCopy2025(language: RewindLanguage): Share2025Copy {
	return SHARE_2025_COPIES[language];
}
