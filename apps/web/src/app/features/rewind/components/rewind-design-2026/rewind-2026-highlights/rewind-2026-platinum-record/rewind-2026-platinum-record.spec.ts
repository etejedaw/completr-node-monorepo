import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen, within } from "@testing-library/angular";

import {
	type PlatinumCover,
	type PlatinumRecord
} from "../rewind-2026-highlights.model";
import { Rewind2026PlatinumRecord } from "./rewind-2026-platinum-record";

const cover = (
	code: string,
	title: string,
	date: string,
	artUrl: string | null = null
): PlatinumCover => ({
	code,
	title,
	date,
	label: `${title}, platinum on ${date}`,
	artUrl
});

const record = (
	covers: PlatinumCover[],
	artUrl: string | null = "https://img.test/art.jpg"
): PlatinumRecord => ({
	total: String(covers.length),
	label: "Platinums this year",
	summary: covers.length === 1 ? "Hades · Apr 2" : "Apr 2 to Oct 26",
	artUrl,
	covers
});

const HADES = cover("hades", "Hades", "Apr 2", "https://img.test/hades.jpg");
const TUNIC = cover("tunic", "Tunic", "Oct 26");

describe("Rewind2026PlatinumRecord", () => {
	function renderRecord(value: PlatinumRecord) {
		return render(Rewind2026PlatinumRecord, {
			inputs: { record: value },
			providers: [provideRouter([])]
		});
	}

	const row = (container: HTMLElement) =>
		container.querySelector("div") as HTMLElement;
	const backdrop = (container: HTMLElement) =>
		container.querySelector("img.absolute") as HTMLElement;

	describe("with one platinum", () => {
		it("covers the whole row with one link and reacts to hover", async () => {
			const { container } = await renderRecord(record([HADES]));

			const link = screen.getByRole("link", {
				name: "Hades, platinum on Apr 2"
			});
			expect(screen.getAllByRole("link")).toHaveLength(1);
			expect(link).toHaveAttribute("href", "/games/hades");
			expect(link).toHaveClass("absolute", "inset-0");
			expect(row(container)).toHaveClass("group");
			expect(backdrop(container)).toHaveClass("group-hover:opacity-20");
			expect(screen.getByText("Hades · Apr 2")).toHaveClass(
				"group-hover:text-fg"
			);
			expect(container).toHaveTextContent("Platinums this year");
		});
	});

	describe("with several platinums", () => {
		it("is not interactive as a row: no hover change, only the covers link", async () => {
			const { container } = await renderRecord(record([HADES, TUNIC]));

			expect(row(container)).not.toHaveClass("group");
			expect(backdrop(container)).not.toHaveClass(
				"group-hover:opacity-20"
			);
			expect(screen.getByText("Apr 2 to Oct 26")).not.toHaveClass(
				"group-hover:text-fg"
			);
			const links = screen.getAllByRole("link");
			expect(links).toHaveLength(2);
			expect(links[1]).toHaveAttribute("href", "/games/tunic");
			expect(within(links[0]).getByText("Apr 2")).toHaveAttribute(
				"aria-hidden",
				"true"
			);
		});

		it("fades the strip edge on phone so the scroll is visible, and hides the scrollbar", async () => {
			await renderRecord(record([HADES, TUNIC]));

			const strip = screen.getByRole("list");
			expect(strip.className).toContain("max-lg:[mask-image:");
			expect(strip).toHaveClass("overflow-x-auto", "max-lg:pr-6");
		});

		it("keeps a placeholder for a cover without art and drops the backdrop without art", async () => {
			const { container } = await renderRecord(
				record([HADES, TUNIC], null)
			);

			expect(backdrop(container)).toBeNull();
			const [, plain] = screen.getAllByRole("link");
			expect(plain.querySelector("img")).toBeNull();
			expect(plain.querySelector("span.bg-surface")).not.toBeNull();
		});
	});

	it("follows the record when it flips between one and many", async () => {
		const { container, rerender } = await renderRecord(record([HADES]));

		for (const covers of [[HADES, TUNIC], [TUNIC], [HADES, TUNIC, HADES]])
			await rerender({ inputs: { record: record(covers) } });

		expect(screen.getAllByRole("link")).toHaveLength(3);
		expect(row(container)).not.toHaveClass("group");
	});
});
