import { type BrandedEmail, type MailContent } from "./mail.interface";

const COLORS = {
	canvas: "#0a0a0c",
	surface: "#131318",
	line: "#1f1f26",
	fg: "#f5f5f7",
	fgSecondary: "#a1a1aa",
	fgMuted: "#71717a",
	brand: "#8b5cf6",
	brandHover: "#a78bfa",
	brandDeep: "#7c3aed",
	brandSolid: "#7c3aed"
};

const SANS_STACK =
	"'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const DISPLAY_STACK = `'Chakra Petch', ${SANS_STACK}`;

const HTML_ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;"
};

function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, char => HTML_ESCAPES[char] ?? char);
}

function fontFaces(webAppUrl: string): string {
	const fontUrl = (file: string) => new URL(`/fonts/${file}`, webAppUrl);
	return `
		@font-face { font-family: 'Chakra Petch'; font-weight: 700; font-style: normal; src: url('${fontUrl("chakra-petch-700-latin.woff2")}') format('woff2'); }
		@font-face { font-family: 'Manrope'; font-weight: 200 800; font-style: normal; src: url('${fontUrl("manrope-latin.woff2")}') format('woff2'); }
	`;
}

function logo(): string {
	return `
		<table role="presentation" cellpadding="0" cellspacing="0" border="0">
			<tr>
				<td width="36" height="36" align="center" valign="middle" bgcolor="${COLORS.brandDeep}" style="width:36px;height:36px;border-radius:8px;background-color:${COLORS.brandDeep};background-image:linear-gradient(135deg, ${COLORS.brand}, ${COLORS.brandDeep});font-family:${DISPLAY_STACK};font-size:18px;font-weight:700;line-height:36px;color:#ffffff;">C</td>
				<td style="padding-left:10px;font-family:${DISPLAY_STACK};font-size:20px;font-weight:700;letter-spacing:-0.02em;color:${COLORS.fg};">Completr</td>
			</tr>
		</table>
	`;
}

function actionButton(action: BrandedEmail["action"]): string {
	return `
		<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
			<tr>
				<td align="center" bgcolor="${COLORS.brandSolid}" style="border-radius:8px;background-color:${COLORS.brandSolid};">
					<a href="${escapeHtml(action.url)}" target="_blank" style="display:inline-block;padding:14px 26px;font-family:${SANS_STACK};font-size:15px;font-weight:700;line-height:20px;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(action.label)}&nbsp;&rarr;</a>
				</td>
			</tr>
		</table>
	`;
}

function paragraph(text: string): string {
	return `<p style="margin:0 0 14px;font-family:${SANS_STACK};font-size:15px;line-height:24px;color:${COLORS.fgSecondary};">${escapeHtml(text)}</p>`;
}

function note(text: string): string {
	return `
		<tr>
			<td width="18" valign="top" style="padding:0 0 8px;font-family:${SANS_STACK};font-size:13px;line-height:20px;color:${COLORS.brand};">&bull;</td>
			<td style="padding:0 0 8px;font-family:${SANS_STACK};font-size:13px;line-height:20px;color:${COLORS.fgSecondary};">${escapeHtml(text)}</td>
		</tr>
	`;
}

function fallbackLink(url: string): string {
	return `
		<p style="margin:20px 0 0;font-family:${SANS_STACK};font-size:12px;line-height:18px;color:${COLORS.fgMuted};">Button not working? Paste this link into your browser:</p>
		<p style="margin:6px 0 0;font-family:${SANS_STACK};font-size:12px;line-height:18px;word-break:break-all;"><a href="${escapeHtml(url)}" target="_blank" style="color:${COLORS.brandHover};text-decoration:underline;">${escapeHtml(url)}</a></p>
	`;
}

function footer(email: BrandedEmail, webAppUrl: string): string {
	const privacyUrl = new URL("/privacy", webAppUrl).toString();
	return `
		<tr>
			<td style="padding:24px 8px 0;font-family:${SANS_STACK};font-size:12px;line-height:18px;color:${COLORS.fgMuted};">
				<p style="margin:0 0 12px;">${escapeHtml(email.footnote)}</p>
				<p style="margin:0;">
					<a href="${escapeHtml(privacyUrl)}" target="_blank" style="color:${COLORS.fgSecondary};text-decoration:none;">Privacy Policy</a>
					&nbsp;&middot;&nbsp;
					Made with &hearts; by <a href="https://www.etejeda.dev" target="_blank" style="color:${COLORS.fgSecondary};text-decoration:none;">Esteban Tejeda</a>
				</p>
			</td>
		</tr>
	`;
}

function renderHtml(email: BrandedEmail, webAppUrl: string): string {
	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="color-scheme" content="dark">
	<meta name="supported-color-schemes" content="dark">
	<title>${escapeHtml(email.subject)}</title>
	<style>
		${fontFaces(webAppUrl)}
		@media (max-width: 600px) {
			.card-body { padding: 28px 22px !important; }
			.heading { font-size: 24px !important; line-height: 30px !important; }
		}
	</style>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.canvas};">
	<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(email.preheader)}</div>
	<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.canvas}" style="background-color:${COLORS.canvas};">
		<tr>
			<td align="center" style="padding:40px 16px;">
				<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
					<tr>
						<td style="padding:0 8px 24px;">${logo()}</td>
					</tr>
					<tr>
						<td bgcolor="${COLORS.surface}" style="background-color:${COLORS.surface};background-image:radial-gradient(circle at 100% 0%, rgba(139,92,246,0.22), rgba(139,92,246,0) 55%);border:1px solid ${COLORS.line};border-radius:12px;">
							<div class="card-body" style="padding:36px 36px 32px;">
								<p style="margin:0;font-family:${SANS_STACK};font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:${COLORS.brand};">${escapeHtml(email.eyebrow)}</p>
								<h1 class="heading" style="margin:8px 0 18px;font-family:${DISPLAY_STACK};font-size:30px;font-weight:700;line-height:36px;letter-spacing:-0.02em;color:${COLORS.fg};">${escapeHtml(email.heading)}</h1>
								${email.paragraphs.map(paragraph).join("")}
								${actionButton(email.action)}
								<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;border-top:1px solid ${COLORS.line};">
									<tr><td colspan="2" style="height:16px;line-height:16px;font-size:0;">&nbsp;</td></tr>
									${email.notes.map(note).join("")}
								</table>
								${fallbackLink(email.action.url)}
							</div>
						</td>
					</tr>
					${footer(email, webAppUrl)}
				</table>
			</td>
		</tr>
	</table>
</body>
</html>`;
}

function renderText(email: BrandedEmail): string {
	return [
		email.heading,
		"",
		...email.paragraphs.flatMap(text => [text, ""]),
		`${email.action.label}: ${email.action.url}`,
		"",
		...email.notes.map(text => `- ${text}`),
		"",
		email.footnote
	].join("\n");
}

export function renderBrandedEmail(
	email: BrandedEmail,
	webAppUrl: string
): MailContent {
	return {
		subject: email.subject,
		text: renderText(email),
		html: renderHtml(email, webAppUrl)
	};
}
