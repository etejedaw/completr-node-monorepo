export const PERSONAL_DATA_EXPORT_FORMAT_VERSION = "1.0";

export const PERSONAL_DATA_EXPORT_CONTROLLER = {
	name: "Esteban Tejeda",
	service: "Completr",
	contactEmail: "completr@etejeda.dev"
} as const;

export const PERSONAL_DATA_EXPORT_PURPOSES = [
	"Operate the service and show you your own content.",
	"Authenticate you and keep your session secure.",
	"Understand in aggregate how the app is used in order to improve it.",
	"Generate your Rewind when you ask for it, including its AI-written summary when your account has it.",
	"Contact you about your account or your invitation."
] as const;

export const PERSONAL_DATA_EXPORT_LEGAL_BASES = [
	"Account data and content: performance of the contract you accept when signing up (Chilean Law 21.719, article 13 letter c).",
	"Aggregated analytics and security logs: legitimate interest in keeping the app running and improving it (article 13 letter d).",
	"Rewind and its AI summary: part of the service you request when generating it (article 13 letter c)."
] as const;

export const PERSONAL_DATA_EXPORT_RECIPIENTS = [
	{
		name: "Email service",
		location: "São Paulo, Brazil",
		purpose:
			"Delivers the emails Completr sends you about your account, invitation and data requests."
	},
	{
		name: "DeepSeek",
		location: "China",
		purpose:
			"Writes the AI summary of a Rewind, only when you generate one that includes it. It receives that year's games, dates, platforms, genres, hours, ratings and derived statistics, plus your notes and private runs only if you switch them on. It receives nothing that identifies you."
	},
	{
		name: "Cloudflare",
		location: "United States",
		purpose:
			"Network provider: all traffic between your device and Completr passes through it."
	}
] as const;

export const PERSONAL_DATA_EXPORT_RETENTION = {
	accountAndContent:
		"For as long as you keep your account. There is no maximum period and no automatic deletion for inactivity.",
	rewinds:
		"Stored with your account, AI summary included, until you delete it. Regenerating a Rewind replaces the previous version.",
	dataSentToDeepSeek:
		"Not controlled by Completr. DeepSeek's terms set no period, so deleting your account does not delete that copy.",
	serverLogs: "30 days, then deleted.",
	analytics: "Aggregated and anonymous, so it is not linked to you.",
	accountDeletion: "Immediate and permanent. No backup copies are kept."
} as const;

export const PERSONAL_DATA_EXPORT_SOURCE =
	"All the data in this file was provided by you while using Completr. No data is bought or obtained from third parties.";
