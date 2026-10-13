import { type PageSection } from "../../../shared/components/page-toc/page-toc";

export const LANDING_PRIVACY_URL = "https://www.completr.app/privacy";

export interface PrivacyHighlight {
	section: string;
	icon: string;
	title: string;
	text: string;
}

export interface PrivacyPolicySection extends PageSection {
	title: string;
	html: string;
}

export interface PrivacyPolicy {
	lang: string;
	version: string;
	updated: string;
	title: string;
	summary: string;
	highlights: PrivacyHighlight[];
	sections: PrivacyPolicySection[];
}
