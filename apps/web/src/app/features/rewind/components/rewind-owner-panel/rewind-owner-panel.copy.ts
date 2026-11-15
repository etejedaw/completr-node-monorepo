import { type RewindLanguage } from "../../../../core/models/rewind.model";
import { type RewindOwnerPanelCopy } from "./rewind-owner-panel.model";

export const REWIND_OWNER_PANEL_COPY: Record<
	RewindLanguage,
	RewindOwnerPanelCopy
> = {
	en: {
		eyebrow: "Your Rewind",
		onlyYou: "Only you",
		onlyYouHint: "Only you see these controls.",
		season: "Season",
		seasonOpen: "Open",
		seasonUntil: date => `until ${date}`,
		aiGenerations: "AI generations",
		aiPerk: "Each AI generation writes a new AI recap and premium stats for this Rewind.",
		aiLeft: () => "left",
		aiGraceExtra: date => `+1 extra until ${date}`,
		aiOutsideSeason: "Only during the season",
		thisVersion: "This version",
		writtenIn: "In English",
		publicRunsOnly: "Public runs only",
		regenerate: "Regenerate",
		regenerating: "Rewinding…",
		regenerationsLeft: count =>
			count <= 0
				? "No AI generations left"
				: count === 1
					? "1 AI generation left"
					: `${count} AI generations left`,
		graceUntil: date => `Extra AI generation available until ${date}`,
		closed: "Closed",
		notOpenYet: "Not open yet",
		closedHint: "This Rewind can't be generated or regenerated anymore.",
		scheduledHint:
			"The next Rewind season hasn't opened yet. Until then this Rewind can't be regenerated.",
		finalVersion: date => `Final version from ${date}`,
		regenerationBlocks: {
			"period-closed":
				"Regenerating only works during the Rewind season.",
			"requires-premium":
				"Rewinds of previous years can only be regenerated with Premium.",
			"no-ai-access": "Regenerating needs Premium or a Rewind gift.",
			"no-regenerations-left":
				"You've used every AI generation for this Rewind."
		},
		includesPrivateRuns: "Includes private runs",
		usesNotes: "Uses your notes",
		aiRecapFailed: "AI recap couldn't be generated",
		retry: "Retry",
		addAiRecap: "Add AI recap",
		addAiRecapHint:
			"Adds an AI-written recap and premium stats. It uses one AI generation.",
		aiRecapPending: "Writing your AI recap… this can take up to a minute.",
		aiRecapErrors: {
			premium_required: "Adding an AI recap needs Premium.",
			year_requires_premium: "AI recaps for previous years need Premium.",
			period_closed:
				"This Rewind is closed, so its AI recap can't be added anymore.",
			limit: "You've used every AI generation for this Rewind.",
			exists: "Your AI recap was already added. We loaded it.",
			in_progress:
				"Your AI recap is already being written. Check back in a minute.",
			not_generated:
				"This Rewind isn't generated anymore. Reload the page.",
			rate_limited: "Too many attempts. Wait a moment and try again.",
			failed: "The AI recap couldn't be written right now. Try again in a few minutes.",
			network:
				"You seem to be offline. Check your connection and try again."
		}
	},
	es: {
		eyebrow: "Tu Rewind",
		onlyYou: "Solo tú",
		onlyYouHint: "Solo tú ves estos controles.",
		season: "Temporada",
		seasonOpen: "Abierta",
		seasonUntil: date => `hasta el ${date}`,
		aiGenerations: "Generaciones con IA",
		aiPerk: "Cada generación con IA escribe un nuevo resumen con IA y estadísticas premium para este Rewind.",
		aiLeft: count => (count === 1 ? "restante" : "restantes"),
		aiGraceExtra: date => `+1 extra hasta el ${date}`,
		aiOutsideSeason: "Solo durante la temporada",
		thisVersion: "Esta versión",
		writtenIn: "En español",
		publicRunsOnly: "Solo runs públicas",
		regenerate: "Regenerar",
		regenerating: "Rebobinando…",
		regenerationsLeft: count =>
			count <= 0
				? "No te quedan generaciones con IA"
				: count === 1
					? "Te queda 1 generación con IA"
					: `Te quedan ${count} generaciones con IA`,
		graceUntil: date =>
			`Generación con IA extra disponible hasta el ${date}`,
		closed: "Cerrado",
		notOpenYet: "Aún no abre",
		closedHint: "Este Rewind ya no se puede generar ni regenerar.",
		scheduledHint:
			"La próxima temporada del Rewind todavía no abre. Hasta entonces este Rewind no se puede regenerar.",
		finalVersion: date => `Versión final del ${date}`,
		regenerationBlocks: {
			"period-closed":
				"Solo se regenera durante la temporada del Rewind.",
			"requires-premium":
				"Los Rewinds de años anteriores solo se regeneran con Premium.",
			"no-ai-access": "Regenerar requiere Premium o un regalo de Rewind.",
			"no-regenerations-left":
				"Ya usaste todas las generaciones con IA de este Rewind."
		},
		includesPrivateRuns: "Incluye runs privadas",
		usesNotes: "Usa tus notas",
		aiRecapFailed: "No se pudo generar el resumen con IA",
		retry: "Reintentar",
		addAiRecap: "Agregar resumen con IA",
		addAiRecapHint:
			"Agrega un resumen escrito con IA y estadísticas premium. Usa una generación con IA.",
		aiRecapPending:
			"Escribiendo tu resumen con IA… puede tardar hasta un minuto.",
		aiRecapErrors: {
			premium_required: "Agregar un resumen con IA requiere Premium.",
			year_requires_premium:
				"Los resúmenes con IA de años anteriores requieren Premium.",
			period_closed:
				"Este Rewind está cerrado: ya no se le puede agregar un resumen con IA.",
			limit: "Ya usaste todas las generaciones con IA de este Rewind.",
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
		}
	}
};
