import {
	col,
	fn,
	literal,
	Op,
	type OrderItem,
	where as whereFn,
	type WhereOptions
} from "sequelize";

import { sequelize } from "../../database/sequelize.database";

const DIACRITICS = /[\u0300-\u036f]/g;
const NON_ALPHANUMERIC_RUNS = /[^a-z0-9]+/;
const NON_ALPHANUMERIC_SQL_PATTERN = "[^a-z0-9]";

export function tokenizeSearchQuery(query: string) {
	return query
		.normalize("NFD")
		.replace(DIACRITICS, "")
		.toLowerCase()
		.split(NON_ALPHANUMERIC_RUNS)
		.filter(token => token.length > 0);
}

function normalizedColumn(column: string) {
	return fn(
		"regexp_replace",
		fn("lower", fn("unaccent", col(column))),
		NON_ALPHANUMERIC_SQL_PATTERN,
		"",
		"g"
	);
}

function normalizedColumnSql(column: string) {
	const quotedColumn = sequelize.getQueryInterface().quoteIdentifiers(column);
	return `regexp_replace(lower(unaccent(${quotedColumn})), '${NON_ALPHANUMERIC_SQL_PATTERN}', '', 'g')`;
}

function tokenWhere(token: string, columns: string[]) {
	const matches = columns.map(column =>
		whereFn(normalizedColumn(column), Op.like, `%${token}%`)
	);
	return matches.length === 1 ? matches[0]! : { [Op.or]: matches };
}

export function buildTextSearchWhere(
	query: string,
	columns: string[]
): WhereOptions | null {
	const tokens = tokenizeSearchQuery(query);
	if (tokens.length === 0 || columns.length === 0) return null;
	return { [Op.and]: tokens.map(token => tokenWhere(token, columns)) };
}

export function buildTextSearchRelevanceOrder(
	query: string,
	column: string
): OrderItem[] {
	const alphabetical: OrderItem[] = [
		[col(column), "ASC"],
		["id", "ASC"]
	];
	const normalizedQuery = tokenizeSearchQuery(query).join("");
	if (!normalizedQuery) return alphabetical;

	const normalized = normalizedColumnSql(column);
	const exact = sequelize.escape(normalizedQuery);
	const prefix = sequelize.escape(`${normalizedQuery}%`);
	const relevance = literal(
		`CASE WHEN ${normalized} = ${exact} THEN 0 WHEN ${normalized} LIKE ${prefix} THEN 1 ELSE 2 END`
	);
	return [[relevance, "ASC"], ...alphabetical];
}
