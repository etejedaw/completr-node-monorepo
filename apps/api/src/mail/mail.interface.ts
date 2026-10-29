export interface MailContent {
	subject: string;
	text: string;
	html: string;
}

export interface MailMessage extends MailContent {
	to: string;
}

export interface MailModel {
	readonly isEnabled: boolean;
	send(message: MailMessage): Promise<void>;
}

export interface BrandedEmail {
	subject: string;
	preheader: string;
	eyebrow: string;
	heading: string;
	paragraphs: string[];
	action: { label: string; url: string };
	notes: string[];
	footnote: string;
}
