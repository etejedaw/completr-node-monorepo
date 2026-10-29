import { type RewindAiRecap } from "../rewind/rewind.interface";
import { type RewindRecapInput } from "./rewind-recap.interface";

export function generateRewindAiRecap(
	_input: RewindRecapInput
): Promise<RewindAiRecap> {
	return Promise.reject(
		new Error("generateRewindAiRecap is not implemented yet")
	);
}
