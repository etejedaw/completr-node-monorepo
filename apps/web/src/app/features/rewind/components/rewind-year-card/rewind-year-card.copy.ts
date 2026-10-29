import { type RewindLanguage } from "../../../../core/models/rewind.model";
import { type RewindYearCardCopy } from "./rewind-year-card.model";

export const REWIND_YEAR_CARD_COPY: Record<RewindLanguage, RewindYearCardCopy> =
	{
		en: {
			finished: count => `${count} finished`,
			started: count => `${count} started`,
			readyToRewind: "Ready to rewind",
			generate: "Generate",
			rewinding: "Rewinding…",
			generateLabel: year => `Generate your ${year} Rewind`
		},
		es: {
			finished: count =>
				count === 1 ? "1 terminado" : `${count} terminados`,
			started: count =>
				count === 1 ? "1 empezado" : `${count} empezados`,
			readyToRewind: "Listo para rebobinar",
			generate: "Generar",
			rewinding: "Rebobinando…",
			generateLabel: year => `Generar tu Rewind ${year}`
		}
	};
