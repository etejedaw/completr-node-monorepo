import { type RewindPersonaCode } from "../rewind.constants";
import { type RewindView } from "../rewind.interface";

export function pickVisiblePersona(
	view: Pick<RewindView, "persona" | "personaWithoutPlatinums">,
	platinumsVisible: boolean
): RewindPersonaCode {
	return platinumsVisible ? view.persona : view.personaWithoutPlatinums;
}
