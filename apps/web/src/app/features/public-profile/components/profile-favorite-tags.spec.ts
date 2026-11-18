import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";

import { ProfileFavoriteTags } from "./profile-favorite-tags";

describe("ProfileFavoriteTags", () => {
	it("shows each favorite with its own icon and color, or the tag icon in the brand color", async () => {
		await render(ProfileFavoriteTags, {
			inputs: {
				tags: [
					{
						tag: "co-op",
						description: "With friends",
						icon: "sports_esports",
						color: "purple"
					},
					{ tag: "cozy", description: null, icon: null, color: null }
				]
			},
			providers: [provideRouter([])]
		});

		const coop = screen.getByRole("link", { name: /co-op/ });
		const coopIcon = coop.querySelector("app-tag-icon") as HTMLElement;
		expect(coopIcon).toHaveTextContent("sports_esports");
		expect(coopIcon.style.color).toBe("var(--color-view-purple)");
		expect(coop).toHaveAttribute("href", "/tags/co-op");

		const cozyIcon = screen
			.getByRole("link", { name: /cozy/ })
			.querySelector("app-tag-icon") as HTMLElement;
		expect(cozyIcon).toHaveTextContent("label");
		expect(cozyIcon.style.color).toBe("var(--color-brand)");
	});
});
