import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";

import { ProfileAccessState } from "./profile-access-state";

describe("ProfileAccessState", () => {
	it("tells the visitor the player does not exist and links to the player search", async () => {
		await render(ProfileAccessState, {
			providers: [provideRouter([])],
			inputs: { reason: "not_found", username: "ghost" }
		});

		expect(
			screen.getByRole("heading", { name: "Player not found" })
		).toBeInTheDocument();
		expect(
			screen.getByText('There\'s no one called "ghost" on Completr.')
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Find players" })
		).toHaveAttribute("href", "/users");
	});

	it("explains that the section is private and links back to the profile", async () => {
		await render(ProfileAccessState, {
			providers: [provideRouter([])],
			inputs: { reason: "private", username: "ada" }
		});

		expect(
			screen.getByRole("heading", { name: "This is private" })
		).toBeInTheDocument();
		expect(
			screen.getByText("@ada doesn't share this publicly.")
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Back to profile" })
		).toHaveAttribute("href", "/user/ada");
	});

	it("uses the custom title for a private section", async () => {
		await render(ProfileAccessState, {
			providers: [provideRouter([])],
			inputs: {
				reason: "private",
				username: "ada",
				privateTitle: "This queue is private"
			}
		});

		expect(
			screen.getByRole("heading", { name: "This queue is private" })
		).toBeInTheDocument();
	});

	it("does not offer the profile link when the player does not exist", async () => {
		await render(ProfileAccessState, {
			providers: [provideRouter([])],
			inputs: { reason: "not_found", username: "ghost" }
		});

		expect(
			screen.queryByRole("link", { name: "Back to profile" })
		).not.toBeInTheDocument();
	});
});
