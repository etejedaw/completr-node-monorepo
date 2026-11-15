import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { signal } from "@angular/core";
import { ActivatedRoute, convertToParamMap } from "@angular/router";
import { render, screen, waitFor } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { type List } from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { ListDetail } from "./list-detail";

const api = environment.apiUrl;
const listUrl = `${api}/lists/list-1`;

function buildList(overrides: Partial<List> = {}): List {
	return {
		id: "list-1",
		userId: "u2",
		name: "Cozy games",
		isPublic: true,
		scoreSource: "metacritic",
		durationSource: "hltb",
		followerCount: 3,
		isFollowing: false,
		owner: { username: "bob" },
		items: [],
		...overrides
	};
}

describe("ListDetail interaction", () => {
	let httpTesting: HttpTestingController;

	async function renderDetail(user = { id: "u1", username: "ada" }) {
		const result = await render(ListDetail, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{
					provide: ActivatedRoute,
					useValue: {
						snapshot: {
							paramMap: convertToParamMap({ id: "list-1" }),
							queryParamMap: convertToParamMap({})
						}
					}
				},
				{
					provide: AuthService,
					useValue: {
						user: signal(user),
						isPremium: signal(false),
						hasPremiumFeature: () => false
					}
				}
			]
		});
		httpTesting = result.fixture.debugElement.injector.get(
			HttpTestingController
		);
		return result;
	}

	afterEach(() => {
		for (const pending of httpTesting.match(() => true))
			if (!pending.cancelled) pending.flush({});
		httpTesting.verify();
	});

	it("shows the not found state when the list does not exist or is not yours", async () => {
		await renderDetail();

		httpTesting
			.expectOne(listUrl)
			.flush(
				{
					type: "LIST_NOT_FOUND",
					title: "List not found",
					status: 404
				},
				{ status: 404, statusText: "Not Found" }
			);

		expect(await screen.findByText("List not found")).toBeInTheDocument();
	});

	it("offers a retry on a server error and loads the list on the second try", async () => {
		const user = userEvent.setup();
		await renderDetail();

		httpTesting
			.expectOne(listUrl)
			.flush(null, { status: 500, statusText: "Server Error" });
		await user.click(
			await screen.findByRole("button", { name: "Try again" })
		);
		httpTesting.expectOne(listUrl).flush({ data: { list: buildList() } });

		expect(
			await screen.findByRole("heading", { name: "Cozy games" })
		).toBeInTheDocument();
		expect(screen.queryByText("List not found")).not.toBeInTheDocument();
	});

	it("keeps the newest list when an older load answers last", async () => {
		const user = userEvent.setup();
		await renderDetail();
		httpTesting
			.expectOne(listUrl)
			.flush({ data: { list: buildList({ name: "First load" }) } });
		await screen.findByRole("heading", { name: "First load" });

		await user.click(screen.getByRole("button", { name: /Follow/ }));
		const follow = httpTesting.expectOne(`${listUrl}/follow`);
		follow.flush("", { status: 204, statusText: "No Content" });
		const reload = httpTesting.expectOne(listUrl);
		reload.flush({
			data: {
				list: buildList({ name: "After follow", isFollowing: true })
			}
		});

		expect(
			await screen.findByRole("heading", { name: "After follow" })
		).toBeInTheDocument();
	});

	it("sends a single follow request on a double click", async () => {
		const user = userEvent.setup();
		await renderDetail();
		httpTesting.expectOne(listUrl).flush({ data: { list: buildList() } });
		const follow = await screen.findByRole("button", { name: /Follow/ });

		await user.dblClick(follow);

		expect(httpTesting.match(`${listUrl}/follow`)).toHaveLength(1);
	});

	it("shows the not found state when following a list that became private", async () => {
		const user = userEvent.setup();
		await renderDetail();
		httpTesting.expectOne(listUrl).flush({ data: { list: buildList() } });

		await user.click(await screen.findByRole("button", { name: /Follow/ }));
		httpTesting
			.expectOne(`${listUrl}/follow`)
			.flush(
				{
					type: "LIST_NOT_FOUND",
					title: "List not found",
					status: 404
				},
				{ status: 404, statusText: "Not Found" }
			);

		await waitFor(() =>
			expect(screen.getByText("List not found")).toBeInTheDocument()
		);
	});
});
