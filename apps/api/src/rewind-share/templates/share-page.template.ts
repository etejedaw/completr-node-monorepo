import { SHARE_IMAGE_SIZES } from "../rewind-share.constants";
import { type SharePageMeta } from "../rewind-share.interface";
import { escapeHtml } from "../utils/escape-html.util";

function metaTag(
	attribute: "name" | "property",
	key: string,
	content: string
): string {
	return `<meta ${attribute}="${key}" content="${escapeHtml(content)}">`;
}

function imageTags(imageUrl: string | null): string[] {
	if (!imageUrl) return [metaTag("name", "twitter:card", "summary")];
	return [
		metaTag("property", "og:image", imageUrl),
		metaTag(
			"property",
			"og:image:width",
			String(SHARE_IMAGE_SIZES.og.width)
		),
		metaTag(
			"property",
			"og:image:height",
			String(SHARE_IMAGE_SIZES.og.height)
		),
		metaTag("name", "twitter:card", "summary_large_image"),
		metaTag("name", "twitter:image", imageUrl)
	];
}

export function sharePageTemplate({
	title,
	description,
	imageUrl,
	redirectUrl
}: SharePageMeta): string {
	const safeTitle = escapeHtml(title);
	const safeRedirectUrl = escapeHtml(redirectUrl);
	const head = [
		'<meta charset="utf-8">',
		'<meta name="viewport" content="width=device-width, initial-scale=1">',
		`<title>${safeTitle}</title>`,
		metaTag("name", "description", description),
		metaTag("property", "og:type", "website"),
		metaTag("property", "og:site_name", "Completr"),
		metaTag("property", "og:title", title),
		metaTag("property", "og:description", description),
		metaTag("property", "og:url", redirectUrl),
		...imageTags(imageUrl),
		metaTag("name", "twitter:title", title),
		metaTag("name", "twitter:description", description),
		`<meta http-equiv="refresh" content="0; url=${safeRedirectUrl}">`,
		`<link rel="canonical" href="${safeRedirectUrl}">`
	];

	return [
		"<!DOCTYPE html>",
		'<html lang="en">',
		"<head>",
		...head,
		"</head>",
		"<body>",
		`<p><a href="${safeRedirectUrl}">Continue to Completr</a></p>`,
		"</body>",
		"</html>"
	].join("\n");
}
