import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";

import { loadEnv } from "vite";

const CONTACT_ENDPOINT_VARIABLE = "PUBLIC_CONTACT_ENDPOINT";
const SECURITY_HEADERS_FILE = "security-headers.conf";

export function connectSources(securityHeaders) {
	const policyLine = securityHeaders
		.split("\n")
		.find(line => line.includes("Content-Security-Policy"));
	if (!policyLine) return [];
	const directive = policyLine
		.slice(policyLine.indexOf('"') + 1, policyLine.lastIndexOf('"'))
		.split(";")
		.map(part => part.trim())
		.find(part => part.startsWith("connect-src "));
	return directive ? directive.split(/\s+/).slice(1) : [];
}

export function contactEndpointProblem(endpoint, securityHeaders) {
	if (!endpoint)
		return `${CONTACT_ENDPOINT_VARIABLE} is not set. The beta signup form needs it at build time (Docker build arg ${CONTACT_ENDPOINT_VARIABLE}).`;
	let origin;
	try {
		origin = new URL(endpoint).origin;
	} catch {
		return `${CONTACT_ENDPOINT_VARIABLE} must be an absolute URL, got "${endpoint}".`;
	}
	if (!origin.startsWith("https://"))
		return `${CONTACT_ENDPOINT_VARIABLE} must use https, got "${endpoint}".`;
	if (!connectSources(securityHeaders).includes(origin))
		return `${CONTACT_ENDPOINT_VARIABLE} points to ${origin}, which is not in connect-src of ${SECURITY_HEADERS_FILE}. Add it there or the browser will block the beta signup form.`;
	return null;
}

export function contactEndpointCheck() {
	return {
		name: "contact-endpoint-check",
		hooks: {
			"astro:config:setup": ({ command, config }) => {
				if (command !== "build") return;
				const root = fileURLToPath(config.root);
				const endpoint = loadEnv("production", root, "PUBLIC_")[
					CONTACT_ENDPOINT_VARIABLE
				];
				const securityHeaders = readFileSync(
					path.join(root, SECURITY_HEADERS_FILE),
					"utf8"
				);
				const problem = contactEndpointProblem(
					endpoint,
					securityHeaders
				);
				if (problem) throw new Error(problem);
			}
		}
	};
}
