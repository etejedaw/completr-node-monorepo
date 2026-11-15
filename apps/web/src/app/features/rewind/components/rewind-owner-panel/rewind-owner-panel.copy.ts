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
		seasonOpen: "Open",
		seasonUntil: date => `until ${date}`,
		aiPerk: "Each AI generation writes a new AI recap and premium stats for this Rewind.",
		aiGenerationsLabel: count =>
			count === 1 ? "AI generation left" : "AI generations left",
		aiGraceExtra: date => `+1 extra until ${date}`,
		writtenIn: "In English",
		publicRunsOnly: "Public runs only",
		regenerate: "Regenerate",
		regenerating: "Rewinding…",
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
		seasonOpen: "Abierta",
		seasonUntil: date => `hasta el ${date}`,
		aiPerk: "Cada generación con IA escribe un nuevo resumen con IA y estadísticas premium para este Rewind.",
		aiGenerationsLabel: count =>
			count === 1
				? "generación con IA restante"
				: "generaciones con IA restantes",
		aiGraceExtra: date => `+1 extra hasta el ${date}`,
		writtenIn: "En español",
		publicRunsOnly: "Solo runs públicas",
		regenerate: "Regenerar",
		regenerating: "Rebobinando…",
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
