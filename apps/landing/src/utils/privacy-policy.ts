import { getEntry } from "astro:content";

export type PolicyLanguage = "es" | "en";

export interface PolicySection {
	id: string;
	label: string;
	icon: string;
	title: string;
	html: string;
}

// Matches a rendered section heading such as <h2 id="who-runs-completr">Who runs Completr</h2>
const SECTION_HEADING = /<h2[^>]*>([\s\S]*?)<\/h2>/g;
const HTML_ENTITIES: Record<string, string> = {
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": '"',
	"&#39;": "'"
};

function toPlainText(html: string): string {
	return html
		.replace(/<[^>]+>/g, "")
		.replace(
			/&(amp|lt|gt|quot|#39);/g,
			entity => HTML_ENTITIES[entity] ?? entity
		)
		.trim();
}

export async function loadPrivacyPolicy(language: PolicyLanguage) {
	const entry = await getEntry("legal", `privacy-${language}`);
	if (!entry?.rendered) {
		throw new Error(`Missing privacy policy for "${language}"`);
	}

	const html = entry.rendered.html;
	const headings = [...html.matchAll(SECTION_HEADING)];
	const { sections: sectionMeta, ...meta } = entry.data;

	if (headings.length !== sectionMeta.length) {
		throw new Error(
			`privacy-${language}.md has ${headings.length} sections but declares ${sectionMeta.length}`
		);
	}

	const sections: PolicySection[] = headings.map((heading, index) => {
		const bodyStart = heading.index + heading[0].length;
		const bodyEnd = headings[index + 1]?.index ?? html.length;
		return {
			...sectionMeta[index]!,
			title: toPlainText(heading[1] ?? ""),
			html: html.slice(bodyStart, bodyEnd).trim()
		};
	});

	return { ...meta, sections };
}
