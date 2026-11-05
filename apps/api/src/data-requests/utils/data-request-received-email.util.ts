import { renderBrandedEmail } from "../../mail/branded-email.template";
import { type MailContent } from "../../mail/mail.interface";
import { type DataRequestEmailDetails } from "../data-requests.interface";

const REQUEST_KIND_LABELS = {
	export: "a copy of their data",
	deletion: "the deletion of their account"
} as const;

export function buildDataRequestReceivedEmail(
	details: DataRequestEmailDetails,
	queueUrl: string,
	webAppUrl: string
): MailContent {
	return renderBrandedEmail(
		{
			subject: `New ${details.type} data request from @${details.username}`,
			preheader: `Answer before ${details.dueDate}.`,
			eyebrow: "Data request",
			heading: "New personal data request",
			paragraphs: [
				`@${details.username} requested ${REQUEST_KIND_LABELS[details.type]}.`,
				`The legal deadline to answer is ${details.dueDate}.`
			],
			action: { label: "Open the request queue", url: queueUrl },
			notes: [
				`Request id: ${details.requestId}`,
				`Requested on ${details.requestedDate}.`
			],
			footnote:
				"You receive this email because this address handles personal data requests for Completr."
		},
		webAppUrl
	);
}
