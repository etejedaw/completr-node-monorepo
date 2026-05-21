import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../environments/environment";

export type ThemeId = "refined-dark" | "midnight-cyan" | "twilight-arcade";
export type ThemeTier = "free" | "premium";

export interface ThemeOption {
	id: ThemeId;
	name: string;
	description: string;
	tier: ThemeTier;
	swatches: string[];
	metaColor: string;
}

const STORAGE_KEY = "completr.theme";
const DEFAULT_THEME: ThemeId = "refined-dark";

export const THEME_CATALOG: ThemeOption[] = [
	{
		id: "refined-dark",
		name: "Refined Dark",
		description: "Minimal, neutral, easy on the eyes.",
		tier: "free",
		swatches: ["#0a0a0c", "#131318", "#8b5cf6", "#f5f5f7"],
		metaColor: "#0a0a0c"
	},
	{
		id: "midnight-cyan",
		name: "Midnight Cyan",
		description: "Original Completr palette — navy slate with cyan accent.",
		tier: "free",
		swatches: ["#0b0f19", "#1e293b", "#0ea5e9", "#e2e8f0"],
		metaColor: "#0b0f19"
	},
	{
		id: "twilight-arcade",
		name: "Twilight Arcade",
		description: "Neon-purple/pink retro arcade vibe.",
		tier: "free",
		swatches: ["#181028", "#261b3f", "#ff5d8f", "#f4eeff"],
		metaColor: "#181028"
	}
];

@Injectable({ providedIn: "root" })
export class ThemeService {
	private readonly http = inject(HttpClient);
	readonly catalog = THEME_CATALOG;

	currentId(): ThemeId {
		const stored = (
			typeof localStorage !== "undefined"
				? localStorage.getItem(STORAGE_KEY)
				: null
		) as ThemeId | null;
		return stored && this.isKnown(stored) ? stored : DEFAULT_THEME;
	}

	current(): ThemeOption {
		const id = this.currentId();
		return this.catalog.find(t => t.id === id) ?? this.catalog[0];
	}

	apply(id: ThemeId | null | undefined) {
		const resolved =
			id && this.isKnown(id as ThemeId) ? (id as ThemeId) : DEFAULT_THEME;
		if (typeof document === "undefined") return;
		document.documentElement.setAttribute("data-theme", resolved);
		const option = this.catalog.find(t => t.id === resolved);
		if (option) {
			const meta = document.querySelector(
				'meta[name="theme-color"]'
			) as HTMLMetaElement | null;
			if (meta) meta.content = option.metaColor;
		}
	}

	setLocal(id: ThemeId) {
		if (!this.isKnown(id)) return;
		try {
			localStorage.setItem(STORAGE_KEY, id);
		} catch {
			/* ignore quota */
		}
		this.apply(id);
	}

	persist(id: ThemeId) {
		this.setLocal(id);
		return this.http.patch<{ data: { user: { theme?: ThemeId } } }>(
			`${environment.apiUrl}/users/me`,
			{ theme: id }
		);
	}

	private isKnown(id: ThemeId): boolean {
		return this.catalog.some(t => t.id === id);
	}
}

export function applyInitialTheme() {
	if (typeof document === "undefined") return;
	const stored = (
		typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null
	) as ThemeId | null;
	const id = stored && THEME_CATALOG.some(t => t.id === stored) ? stored : DEFAULT_THEME;
	document.documentElement.setAttribute("data-theme", id);
	const option = THEME_CATALOG.find(t => t.id === id);
	if (option) {
		const meta = document.querySelector(
			'meta[name="theme-color"]'
		) as HTMLMetaElement | null;
		if (meta) meta.content = option.metaColor;
	}
}
