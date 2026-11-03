import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { LibraryHero } from "./library-hero";
import { profileBackLink } from "./library-hero-back-link";

describe("LibraryHero", () => {
	it("titles the page with the heading as h1", async () => {
		await render(LibraryHero, { inputs: { heading: "Rewind" } });

		expect(
			screen.getByRole("heading", { level: 1, name: "Rewind" })
		).toBeInTheDocument();
	});

	it("paints the eyebrow when there is no back link", async () => {
		await render(LibraryHero, {
			inputs: { heading: "Lists", eyebrow: "Library" }
		});

		expect(screen.getByText("Library")).toBeInTheDocument();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	it("turns the eyebrow into a back link with an arrow", async () => {
		await render(LibraryHero, {
			inputs: {
				heading: "Rewind",
				eyebrow: "Ignored",
				backLink: profileBackLink("ana")
			},
			routes: []
		});

		const link = screen.getByRole("link", { name: "@ana's profile" });
		expect(link).toHaveAttribute("href", "/user/ana");
		expect(link).toHaveClass("tap-area");
		expect(link.querySelector(".material-icons")).toHaveAttribute(
			"aria-hidden",
			"true"
		);
		expect(screen.queryByText("Ignored")).not.toBeInTheDocument();
	});

	it("reaches the back link with the keyboard", async () => {
		const user = userEvent.setup();
		await render(LibraryHero, {
			inputs: {
				heading: "List",
				backLink: { label: "Lists", link: "/lists" }
			},
			routes: []
		});

		await user.tab();

		expect(screen.getByRole("link", { name: "Lists" })).toHaveFocus();
		expect(screen.getByRole("link", { name: "Lists" })).toHaveAttribute(
			"href",
			"/lists"
		);
	});

	it("names the page in the back link label", () => {
		expect(profileBackLink("ana", "library")).toEqual({
			label: "@ana's library",
			link: ["/user", "ana"]
		});
	});
});
