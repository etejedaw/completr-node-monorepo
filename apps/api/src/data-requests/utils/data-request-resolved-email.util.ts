import { renderBrandedEmail } from "../../mail/branded-email.template";
import { type BrandedEmail, type MailContent } from "../../mail/mail.interface";
import { type DataRequestEmailDetails } from "../data-requests.interface";

function completedExportEmail(
	details: DataRequestEmailDetails,
	actionUrl: string
): BrandedEmail {
	return {
		subject: "Your Completr data is ready",
		preheader: `Download it before ${details.downloadableUntilDate}.`,
		eyebrow: "Data request",
		heading: "Your data is ready",
		paragraphs: [
			`Hi @${details.username},`,
			"The copy of your Completr data you asked for is ready. It is a JSON file with everything stored about your account."
		],
		action: { label: "Download your data", url: actionUrl },
		notes: [
			`The download is available until ${details.downloadableUntilDate}.`,
			"The file is generated when you download it, so it reflects your data at that moment."
		],
		footnote:
			"Didn't ask for this? Change your password and write to completr@etejeda.dev."
	};
}

function completedDeletionEmail(
	details: DataRequestEmailDetails,
	actionUrl: string
): BrandedEmail {
	return {
		subject: "Your Completr account is being deleted",
		preheader: "Your account and all its data are deleted for good.",
		eyebrow: "Data request",
		heading: "Your account is being deleted",
		paragraphs: [
			`Hi @${details.username},`,
			"As you asked, your Completr account and everything stored with it are being deleted right now. This cannot be undone."
		],
		action: { label: "Visit Completr", url: actionUrl },
		notes: [
			"Your profile, backlog, lists, reviews, follows and Rewinds are removed.",
			"You can create a new account whenever you want."
		],
		footnote: "Thanks for having used Completr."
	};
}

function rejectedEmail(
	details: DataRequestEmailDetails,
	actionUrl: string
): BrandedEmail {
	return {
		subject: "About your Completr data request",
		preheader: "Your request could not be completed.",
		eyebrow: "Data request",
		heading: "Your request was rejected",
		paragraphs: [
			`Hi @${details.username},`,
			`Your ${details.type} request from ${details.requestedDate} could not be completed.`,
			`Reason: ${details.resolutionNote ?? "not specified"}`
		],
		action: { label: "Review your requests", url: actionUrl },
		notes: [
			"You can reply to completr@etejeda.dev if you disagree.",
			"You can also file a complaint with the Chilean Personal Data Protection Agency."
		],
		footnote: "You receive this email because you made a data request."
	};
}

export function buildDataRequestResolvedEmail(
	details: DataRequestEmailDetails,
	actionUrl: string,
	webAppUrl: string
): MailContent {
	if (details.status === "rejected")
		return renderBrandedEmail(rejectedEmail(details, actionUrl), webAppUrl);
	if (details.type === "deletion")
		return renderBrandedEmail(
			completedDeletionEmail(details, webAppUrl),
			webAppUrl
		);
	return renderBrandedEmail(
		completedExportEmail(details, actionUrl),
		webAppUrl
	);
}
