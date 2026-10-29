import { type RewindLanguage } from "../../../../core/models/rewind.model";
import { type RewindAiRecapError } from "../../rewind-errors";

export interface RewindOwnerPanelCopy {
	eyebrow: string;
	onlyYou: string;
	regenerate: string;
	regenerating: string;
	regenerationsLeft: (count: number) => string;
	graceUntil: (date: string) => string;
	includesPrivateRuns: string;
	aiRecapFailed: string;
	retry: string;
	addAiRecap: string;
	addAiRecapHint: string;
	aiRecapPending: string;
	aiRecapErrors: Record<RewindAiRecapError, string>;
	dateLocale: string;
}

export const REWIND_OWNER_PANEL_COPY: Record<
	RewindLanguage,
	RewindOwnerPanelCopy
> = {
	en: {
		eyebrow: "Your Rewind",
		onlyYou: "Only you see these controls.",
		regenerate: "Regenerate",
		regenerating: "Rewinding…",
		regenerationsLeft: count =>
			count <= 0
				? "No regular regenerations left"
				: count === 1
					? "1 regeneration left"
					: `${count} regenerations left`,
		graceUntil: date => `Extra regeneration available until ${date}`,
		includesPrivateRuns: "Includes private runs",
		aiRecapFailed: "AI recap couldn't be generated",
		retry: "Retry",
		addAiRecap: "Add AI recap",
		addAiRecapHint:
			"Adds an AI-written recap and premium stats without using a regeneration.",
		aiRecapPending: "Writing your AI recap… this can take up to a minute.",
		aiRecapErrors: {
			premium_required: "Adding an AI recap needs Premium.",
			exists: "Your AI recap was already added. We loaded it.",
			in_progress:
				"Your AI recap is already being written. Check back in a minute.",
			not_generated:
				"This Rewind isn't generated anymore. Reload the page.",
			rate_limited: "Too many attempts. Wait a moment and try again.",
			failed: "The AI recap couldn't be written right now. Try again in a few minutes.",
			network:
				"You seem to be offline. Check your connection and try again."
		},
		dateLocale: "en-US"
	},
	es: {
		eyebrow: "Tu Rewind",
		onlyYou: "Solo tú ves estos controles.",
		regenerate: "Regenerar",
		regenerating: "Rebobinando…",
		regenerationsLeft: count =>
			count <= 0
				? "No te quedan regeneraciones"
				: count === 1
					? "Te queda 1 regeneración"
					: `Te quedan ${count} regeneraciones`,
		graceUntil: date => `Regeneración extra disponible hasta el ${date}`,
		includesPrivateRuns: "Incluye runs privadas",
		aiRecapFailed: "No se pudo generar el resumen con IA",
		retry: "Reintentar",
		addAiRecap: "Agregar resumen con IA",
		addAiRecapHint:
			"Agrega un resumen escrito con IA y estadísticas premium sin gastar una regeneración.",
		aiRecapPending:
			"Escribiendo tu resumen con IA… puede tardar hasta un minuto.",
		aiRecapErrors: {
			premium_required: "Agregar un resumen con IA requiere Premium.",
			exists: "Tu resumen con IA ya estaba agregado. Lo cargamos.",
			in_progress:
				"Tu resumen con IA ya se está escribiendo. Vuelve en un minuto.",
			not_generated:
				"Este Rewind ya no está generado. Recarga la página.",
			rate_limited:
				"Demasiados intentos. Espera un momento y vuelve a intentarlo.",
			failed: "No se pudo escribir el resumen con IA. Inténtalo de nuevo en unos minutos.",
			network:
				"Parece que no tienes conexión. Revísala y vuelve a intentarlo."
		},
		dateLocale: "es-ES"
	}
};

export function formatPanelDate(isoDate: string, locale: string): string {
	return new Intl.DateTimeFormat(locale, {
		month: locale.startsWith("es") ? "long" : "short",
		day: "numeric",
		timeZone: "UTC"
	}).format(new Date(`${isoDate}T00:00:00Z`));
}
