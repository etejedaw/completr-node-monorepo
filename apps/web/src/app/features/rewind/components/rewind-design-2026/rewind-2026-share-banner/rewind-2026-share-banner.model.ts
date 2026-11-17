import { type RewindLanguage } from "../../../../../core/models/rewind.model";
import { type Rewind2026FanSource } from "../rewind-2026-cover-fan/rewind-2026-cover-fan.model";

export interface Rewind2026ShareBannerSource extends Rewind2026FanSource {
	year: number;
	language: RewindLanguage;
}
