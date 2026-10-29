import "@testing-library/jest-dom/vitest";

import { render, screen, within } from "@testing-library/angular";

import {
	REWIND_INSIGHT_KINDS,
	type RewindAiRecap as RewindAiRecapData,
	type RewindLanguage
} from "../../../../core/models/rewind.model";
import { ToastService } from "../../../../core/services/toast";
import {
	INSIGHT_STYLE,
	RewindAiRecap,
	summaryParagraphs
} from "./rewind-ai-recap";

function recap(overrides: Partial<RewindAiRecapData> = {}): RewindAiRecapData {
	return {
		headline: "A year of roguelikes and late nights",
		summary:
			"You finished 18 games.\n\nMost of them were roguelikes you kept coming back to.",
		insights: [
			{
				kind: "taste-vs-critics",
				title: "You loved what critics shrugged at",
				body: "Three of your 5-star games scored under 75."
			},
			{
				kind: "seasonal-rhythm",
				title: "March was your month",
				body: "You played 40 hours in March alone."
			},
			{
				kind: "finish-discipline",
				title: "You see the credits",
				body: "82% of what you started, you finished."
			}
		],
		funFact: "You spent more time in Hades than in any other game.",
		nextYearChallenge: "Finish one game longer than 60 hours.",
		...overrides
	};
}

async function renderRecap(
	data: RewindAiRecapData = recap(),
	language: RewindLanguage = "en"
) {
	return render(RewindAiRecap, {
		inputs: { recap: data, year: 2026, language },
		providers: [{ provide: ToastService, useValue: { premium: vi.fn() } }]
	});
}

describe("RewindAiRecap", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({ matches: true }))
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("shows the headline, every paragraph, three insights, the fun fact and next year's challenge", async () => {
		await renderRecap();

		const section = screen.getByRole("region", { name: "AI recap" });
		expect(
			within(section).getByText("A year of roguelikes and late nights")
		).toBeInTheDocument();
		expect(
			within(section).getByText("You finished 18 games.")
		).toBeInTheDocument();
		expect(
			within(section).getByText(
				"Most of them were roguelikes you kept coming back to."
			)
		).toBeInTheDocument();
		const insights = within(
			within(section).getByRole("list", { name: "Insights" })
		).getAllByRole("listitem");
		expect(insights).toHaveLength(3);
		expect(
			within(insights[0]).getByText("Taste vs. critics")
		).toBeInTheDocument();
		expect(
			within(insights[0]).getByRole("heading", {
				name: "You loved what critics shrugged at"
			})
		).toBeInTheDocument();
		expect(
			within(section).getByRole("heading", { name: "Fun fact" })
		).toBeInTheDocument();
		expect(
			within(section).getByRole("heading", {
				name: "Your 2027 challenge"
			})
		).toBeInTheDocument();
		expect(
			within(section).getByText("Finish one game longer than 60 hours.")
		).toBeInTheDocument();
	});

	it("marks the section as Premium with a spark next to the title", async () => {
		await renderRecap();

		const section = screen.getByRole("region", { name: "AI recap" });
		expect(within(section).getByLabelText("Premium")).toBeInTheDocument();
		expect(within(section).getByText("auto_awesome")).toHaveAttribute(
			"aria-hidden",
			"true"
		);
		expect(section.className).toContain("border-premium");
	});

	it("renders HTML and scripts from the AI as plain text", async () => {
		await renderRecap(
			recap({
				headline: "<img src=x onerror=alert(1)>Hacked",
				summary: "<script>alert('xss')</script>\n\n<b>bold</b>",
				insights: [
					{
						kind: "genre-pattern",
						title: "<h1>Big</h1>",
						body: "<a href='javascript:alert(1)'>click</a>"
					}
				],
				funFact: "<iframe src='https://evil.test'></iframe>",
				nextYearChallenge: "<style>body{display:none}</style>"
			})
		);

		const section = screen.getByRole("region", { name: "AI recap" });
		expect(
			within(section).getByText("<img src=x onerror=alert(1)>Hacked")
		).toBeInTheDocument();
		expect(
			within(section).getByText("<script>alert('xss')</script>")
		).toBeInTheDocument();
		expect(within(section).getByText("<b>bold</b>")).toBeInTheDocument();
		expect(within(section).getByText("<h1>Big</h1>")).toBeInTheDocument();
		expect(
			section.querySelector("script, img, iframe, style, b, a, h1")
		).toBeNull();
	});

	it("keeps long texts and emoji inside the layout", async () => {
		const longWord = "Supercalifragilistic".repeat(30);
		await renderRecap(
			recap({
				headline: `🎮🔥 ${longWord}`,
				insights: [
					{
						kind: "long-vs-short",
						title: longWord,
						body: "⏳".repeat(400)
					}
				]
			})
		);

		const headline = screen.getByText(`🎮🔥 ${longWord}`);
		expect(headline.className).toContain("[overflow-wrap:anywhere]");
		expect(
			screen.getByRole("heading", { name: longWord }).className
		).toContain("[overflow-wrap:anywhere]");
	});

	it("speaks Spanish when the Rewind was generated in Spanish", async () => {
		await renderRecap(recap(), "es");

		const section = screen.getByRole("region", { name: "Resumen con IA" });
		expect(
			within(section).getByText("Tu gusto vs. la crítica")
		).toBeInTheDocument();
		expect(
			within(section).getByRole("heading", { name: "Dato curioso" })
		).toBeInTheDocument();
		expect(
			within(section).getByRole("heading", { name: "Tu reto para 2027" })
		).toBeInTheDocument();
	});

	it("skips empty parts instead of leaving gaps", async () => {
		await renderRecap(
			recap({
				summary: "  \n\n  ",
				insights: [],
				funFact: "",
				nextYearChallenge: ""
			})
		);

		const section = screen.getByRole("region", { name: "AI recap" });
		expect(within(section).queryByRole("list")).not.toBeInTheDocument();
		expect(within(section).queryByText("Fun fact")).not.toBeInTheDocument();
		expect(
			within(section).queryByText(/challenge/)
		).not.toBeInTheDocument();
		expect(section.querySelectorAll("p")).toHaveLength(1);
	});

	it("still shows an insight of a kind this version does not know", async () => {
		await renderRecap(
			recap({
				insights: [
					{
						kind: "speedrun-streak" as never,
						title: "Fast hands",
						body: "Three games under five hours."
					}
				]
			})
		);

		expect(
			screen.getByRole("heading", { name: "Fast hands" })
		).toBeInTheDocument();
		expect(screen.getByText("insights")).toBeInTheDocument();
	});

	it("gives every insight kind of the contract its own icon", () => {
		const icons = REWIND_INSIGHT_KINDS.map(
			kind => INSIGHT_STYLE[kind].icon
		);
		expect(new Set(icons).size).toBe(REWIND_INSIGHT_KINDS.length);
	});

	it("splits the summary into paragraphs on blank lines only", () => {
		expect(
			summaryParagraphs("One.\nStill one.\n\n\nTwo.\n \nThree.")
		).toEqual(["One.\nStill one.", "Two.", "Three."]);
	});
	it.each([
		[
			"en",
			"Premium perk",
			"The AI recap reads the whole year to describe the player behind it."
		],
		[
			"es",
			"Ventaja Premium",
			"El resumen con IA lee todo el año para describir al jugador que hay detrás."
		]
	] as const)(
		"explains the Premium perk in %s when the badge is pressed, once per press",
		async (language, title, message) => {
			const view = await renderRecap(recap(), language);
			const toast = view.fixture.debugElement.injector.get(ToastService);

			const badge = screen.getByRole("button", { name: "Premium" });
			badge.click();
			badge.click();

			expect(toast.premium).toHaveBeenCalledTimes(2);
			expect(toast.premium).toHaveBeenCalledWith(title, message);
		}
	);
});
