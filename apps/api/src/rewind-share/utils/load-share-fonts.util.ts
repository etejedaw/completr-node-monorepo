import { readFileSync } from "node:fs";

import { type Font } from "satori";

import { SHARE_FONT_FAMILY } from "../rewind-share.constants";

const FONT_SOURCES = [
	{
		name: SHARE_FONT_FAMILY.display,
		weight: 600,
		file: "@fontsource/chakra-petch/files/chakra-petch-latin-600-normal.woff"
	},
	{
		name: SHARE_FONT_FAMILY.display,
		weight: 700,
		file: "@fontsource/chakra-petch/files/chakra-petch-latin-700-normal.woff"
	},
	{
		name: SHARE_FONT_FAMILY.display,
		weight: 600,
		file: "@fontsource/chakra-petch/files/chakra-petch-latin-ext-600-normal.woff"
	},
	{
		name: SHARE_FONT_FAMILY.display,
		weight: 700,
		file: "@fontsource/chakra-petch/files/chakra-petch-latin-ext-700-normal.woff"
	},
	{
		name: SHARE_FONT_FAMILY.text,
		weight: 400,
		file: "@fontsource/manrope/files/manrope-latin-400-normal.woff"
	},
	{
		name: SHARE_FONT_FAMILY.text,
		weight: 600,
		file: "@fontsource/manrope/files/manrope-latin-600-normal.woff"
	},
	{
		name: SHARE_FONT_FAMILY.text,
		weight: 400,
		file: "@fontsource/manrope/files/manrope-latin-ext-400-normal.woff"
	},
	{
		name: SHARE_FONT_FAMILY.text,
		weight: 600,
		file: "@fontsource/manrope/files/manrope-latin-ext-600-normal.woff"
	}
] as const;

let loadedFonts: Font[] | undefined;

export function loadShareFonts(): Font[] {
	loadedFonts ??= FONT_SOURCES.map(({ name, weight, file }) => ({
		name,
		weight,
		style: "normal",
		data: readFileSync(require.resolve(file))
	}));
	return loadedFonts;
}
