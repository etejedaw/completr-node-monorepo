import { renderBrandedEmail } from "../../mail/branded-email.template";
import { type MailContent } from "../../mail/mail.interface";

export function buildPasswordResetEmail(
	username: string,
	resetUrl: string,
	ttlMinutes: number,
	webAppUrl: string
): MailContent {
	return renderBrandedEmail(
		{
			subject: "Reset your Completr password",
			preheader: `Choose a new password. The link expires in ${ttlMinutes} minutes.`,
			eyebrow: "Password recovery",
			heading: "Reset your password",
			paragraphs: [
				`Hi @${username},`,
				"We received a request to reset the password of your Completr account. Use the button below to choose a new one and get back to your backlog."
			],
			action: { label: "Choose a new password", url: resetUrl },
			notes: [
				`The link expires in ${ttlMinutes} minutes.`,
				"It works only once.",
				"Updating your password signs you out on every device."
			],
			footnote:
				"Didn't ask for this? You can ignore this email: your password stays the same."
		},
		webAppUrl
	);
}
