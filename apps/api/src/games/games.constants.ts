export const EXTERNAL_DATA_SOURCES = ["metacritic", "hltb"] as const;

export type ExternalDataSource = (typeof EXTERNAL_DATA_SOURCES)[number];
