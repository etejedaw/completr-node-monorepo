import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { ViewportService } from "../../../core/services/viewport";
import { OnboardingTour } from "./onboarding-tour";

async function renderTour() {
	const result = await render(OnboardingTour, {
		providers: [
			{ provide: ViewportService, useValue: { isMobile: signal(false) } }
		]
	});
	return result;
}

describe("OnboardingTour", () => {
	it("starts on the first step without a Back button", async () => {
		await renderTour();

		expect(
			screen.getByRole("dialog", { name: "Your library" })
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Back" })
		).not.toBeInTheDocument();
		expect(screen.getByText("collections_bookmark")).toBeInTheDocument();
	});

	it("moves to the last step and shows its icon and closing actions", async () => {
		const typist = userEvent.setup();
		await renderTour();

		await typist.click(screen.getByRole("button", { name: "Next" }));

		expect(
			screen.getByRole("dialog", { name: "Discover" })
		).toBeInTheDocument();
		expect(screen.getByText("explore")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Let's go" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Read full guide/ })
		).toBeInTheDocument();
	});

	it("never goes past the last step when Next is clicked repeatedly", async () => {
		const typist = userEvent.setup();
		await renderTour();

		await typist.click(screen.getByRole("button", { name: "Next" }));
		expect(
			screen.queryByRole("button", { name: "Next" })
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("dialog", { name: "Discover" })
		).toBeInTheDocument();
	});

	it("goes back to the first step", async () => {
		const typist = userEvent.setup();
		await renderTour();

		await typist.click(screen.getByRole("button", { name: "Next" }));
		await typist.click(screen.getByRole("button", { name: "Back" }));

		expect(
			screen.getByRole("dialog", { name: "Your library" })
		).toBeInTheDocument();
	});

	it("emits skip from Skip and from Escape", async () => {
		const typist = userEvent.setup();
		const { fixture } = await renderTour();
		const skip = vi.fn();
		fixture.componentInstance.skip.subscribe(skip);

		await typist.click(screen.getByRole("button", { name: "Skip" }));
		await typist.keyboard("{Escape}");

		expect(skip).toHaveBeenCalledTimes(2);
	});
});
