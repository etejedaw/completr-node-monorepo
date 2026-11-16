import { type RewindOwnerPanelCopy } from "./rewind-owner-panel.model";

export const REWIND_OWNER_PANEL_COPY: RewindOwnerPanelCopy = {
	eyebrow: "Your Rewind",
	onlyYou: "Only you",
	onlyYouHint: "Only you see these controls.",
	seasonOpen: "Open",
	seasonUntil: date => `until ${date}`,
	aiGenerationsLabel: count =>
		count === 1 ? "AI generation left" : "AI generations left",
	aiGraceExtra: date => `+1 extra until ${date}`,
	aiPerk: "Each AI generation writes a new AI recap and premium stats for this Rewind.",
	writtenIn: { en: "In English", es: "In Spanish" },
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
		"period-closed": "Regenerating only works during the Rewind season.",
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
	addAiRecapHint: "Adds an AI-written recap to this Rewind."
};
