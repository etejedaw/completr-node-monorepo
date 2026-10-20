import { renderBrandedEmail } from "../mail/branded-email.template";
import { type MailContent } from "../mail/mail.interface";

export function buildInvitationEmail(
	acceptUrl: string,
	ttlDays: number,
	webAppUrl: string
): MailContent {
	return renderBrandedEmail(
		{
			subject: "You're invited to Completr",
			preheader: `Create your account. The invitation expires in ${ttlDays} days.`,
			eyebrow: "You're invited",
			heading: "Join Completr",
			paragraphs: [
				"Hi there,",
				"You've been invited to Completr, the backlog tracker that ranks what to play next by score and length. Choose your username, name and password to create your account."
			],
			action: { label: "Create your account", url: acceptUrl },
			notes: [
				`The invitation expires in ${ttlDays} days.`,
				"It works only once.",
				"Your account uses the email this invitation was sent to."
			],
			footnote:
				"Not expecting this? You can ignore this email: no account is created until you accept."
		},
		webAppUrl
	);
}
