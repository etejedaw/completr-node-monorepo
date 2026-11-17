import "@testing-library/jest-dom/vitest";

import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { fireEvent, render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { SkipLink } from "./skip-link";

@Component({
	selector: "app-skip-link-host",
	imports: [SkipLink],
	template: `
		<app-skip-link />
		<nav><a href="/feed">Feed</a></nav>
		@if (hasMain()) {
			<main id="main-content" tabindex="-1"><h1>Page</h1></main>
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class SkipLinkHost {
	readonly hasMain = signal(true);
}

describe("SkipLink", () => {
	function skipLink() {
		return screen.getByRole("link", { name: "Skip to content" });
	}

	it("is the first stop when tabbing into the page", async () => {
		await render(SkipLinkHost);
		const user = userEvent.setup();

		await user.tab();

		expect(skipLink()).toHaveFocus();
		expect(skipLink()).toHaveAttribute("href", "#main-content");
	});

	it("moves focus to the main content without touching the URL, even on a double activation", async () => {
		await render(SkipLinkHost);
		const user = userEvent.setup();
		const urlBefore = window.location.href;

		await user.tab();
		await user.keyboard("{Enter}");
		skipLink().focus();
		await user.dblClick(skipLink());

		expect(screen.getByRole("main")).toHaveFocus();
		expect(window.location.href).toBe(urlBefore);
	});

	it("lets the browser handle a modified click such as opening a new tab", async () => {
		await render(SkipLinkHost);

		const handled = !fireEvent.click(skipLink(), { ctrlKey: true });

		expect(handled).toBe(false);
		expect(screen.getByRole("main")).not.toHaveFocus();
	});

	it("does nothing harmful when the page has no main content yet", async () => {
		const { fixture } = await render(SkipLinkHost);
		fixture.componentInstance.hasMain.set(false);
		fixture.detectChanges();

		const handled = !fireEvent.click(skipLink());

		expect(handled).toBe(false);
	});
});
