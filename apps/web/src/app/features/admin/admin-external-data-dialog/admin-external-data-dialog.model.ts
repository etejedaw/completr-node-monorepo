import { type UiBadgeTone } from "../../../shared/ui";
import {
	type ExternalDataRefreshResult,
	type ExternalDataSource
} from "../../games/games.model";

export type ExternalDataRefreshState =
	| { status: "idle" }
	| { status: "pending" }
	| { status: "done"; results: ExternalDataRefreshResult[] }
	| { status: "error"; message: string };

export interface ExternalDataSourceOption {
	source: ExternalDataSource;
	name: string;
	label: string;
}

export interface ExternalDataResultView {
	source: ExternalDataSource;
	sourceName: string;
	statusLabel: string;
	icon: string;
	tone: UiBadgeTone;
	details: string[];
}
