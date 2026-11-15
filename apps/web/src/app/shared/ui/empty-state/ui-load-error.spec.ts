import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { UiLoadError } from "./ui-load-error";

describe("UiLoadError", () => {
	it("announces the failure and offers a retry", async () => {
		const retried = vi.fn();
		await render(UiLoadError, { on: { retried } });

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Couldn't load this page"
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Try again" })
		);

		expect(retried).toHaveBeenCalledTimes(1);
	});

	it("emits once per click when the user hammers retry", async () => {
		const retried = vi.fn();
		await render(UiLoadError, { on: { retried } });

		await userEvent.tripleClick(
			screen.getByRole("button", { name: "Try again" })
		);

		expect(retried).toHaveBeenCalledTimes(3);
	});

	it("uses the title it is given", async () => {
		await render(UiLoadError, {
			inputs: { title: "Couldn't load the catalog" }
		});

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Couldn't load the catalog"
		);
	});
});
