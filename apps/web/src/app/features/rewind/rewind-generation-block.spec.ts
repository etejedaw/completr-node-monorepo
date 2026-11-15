import { type RewindPeriod } from "../../core/models/rewind.model";
import { rewindGenerationBlockMessage } from "./rewind-generation-block";

function period(status: RewindPeriod["status"]): RewindPeriod {
	return {
		status,
		year: 2027,
		opensAt: "2027-12-01",
		closesAt: "2028-01-31"
	};
}

describe("rewindGenerationBlockMessage", () => {
	it("asks for Premium for a previous year whatever the period says", () => {
		for (const current of [null, period("open"), period("scheduled")])
			expect(
				rewindGenerationBlockMessage("requires-premium", current, "en")
			).toBe(
				"Rewinds of previous years can only be generated with Premium."
			);
		expect(
			rewindGenerationBlockMessage("requires-premium", null, "es")
		).toBe("Los Rewinds de años anteriores solo se generan con Premium.");
	});

	it("tells when generation opens again while the next season is scheduled", () => {
		expect(
			rewindGenerationBlockMessage(
				"period-closed",
				period("scheduled"),
				"en"
			)
		).toBe("Rewind generation opens on Dec 1, 2027.");
		expect(
			rewindGenerationBlockMessage(
				"period-closed",
				period("scheduled"),
				"es"
			)
		).toBe("La generación de Rewinds abre el 1 de diciembre de 2027.");
	});

	it("says the season is closed when nothing is scheduled", () => {
		for (const current of [null, period("closed")]) {
			expect(
				rewindGenerationBlockMessage("period-closed", current, "en")
			).toMatch(/^The Rewind season is closed/);
			expect(
				rewindGenerationBlockMessage("period-closed", current, "es")
			).toMatch(/^La temporada del Rewind está cerrada/);
		}
	});
});
