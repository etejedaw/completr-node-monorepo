import { ChangeDetectionStrategy, Component } from "@angular/core";

import { IGDB_FALLBACK_NOTE } from "../../constants/online-search";

@Component({
	selector: "app-online-source-note",
	templateUrl: "./online-source-note.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnlineSourceNote {
	protected readonly note = IGDB_FALLBACK_NOTE;
}
