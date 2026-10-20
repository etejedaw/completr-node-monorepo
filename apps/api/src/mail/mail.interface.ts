export interface SmtpSettings {
	host?: string;
	port: number;
	secure: boolean;
	user?: string;
	password?: string;
	from: string;
}

export interface MailContent {
	subject: string;
	text: string;
	html: string;
}

export interface MailMessage extends MailContent {
	to: string;
}
