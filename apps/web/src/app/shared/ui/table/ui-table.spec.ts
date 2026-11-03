import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { UiTable } from "./ui-table";

@Component({
	imports: [UiTable],
	template: `
		<table uiTable [framed]="framed()">
			<thead>
				<tr>
					<th>Title</th>
					<th data-align="end" [attr.data-highlighted]="''">Ratio</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>Celeste</td>
					<td data-align="end">9.1</td>
				</tr>
			</tbody>
		</table>
	`
})
class Host {
	readonly framed = signal(false);
}

describe("UiTable", () => {
	function render(framed = false) {
		const fixture = TestBed.createComponent(Host);
		fixture.componentInstance.framed.set(framed);
		fixture.detectChanges();
		const table = (fixture.nativeElement as HTMLElement).querySelector(
			"table"
		) as HTMLTableElement;
		return { fixture, table };
	}

	it("keeps the bottom border of the last row outside a framed container", () => {
		const { table } = render();

		expect(table.hasAttribute("data-framed")).toBe(false);
		expect(table.className).toContain("[&_tbody_tr]:border-b");
	});

	it("drops the last row border inside a framed container", () => {
		const { table } = render(true);

		expect(table.getAttribute("data-framed")).toBe("");
		expect(table.className).toContain(
			"[&[data-framed]_tbody_tr:last-child]:border-b-0"
		);
	});

	it("toggles the framed state back and forth", () => {
		const { fixture, table } = render(true);
		fixture.componentInstance.framed.set(false);
		fixture.detectChanges();

		expect(table.hasAttribute("data-framed")).toBe(false);
	});

	it("aligns end cells and highlights headers through data attributes", () => {
		const { table } = render();

		expect(table.className).toContain(
			"[&_:is(th,td)[data-align=end]]:text-right"
		);
		expect(table.className).toContain(
			"[&_thead_th[data-highlighted]]:text-brand"
		);
		expect(table.className).not.toMatch(/(^|\s)!/);
	});
});
