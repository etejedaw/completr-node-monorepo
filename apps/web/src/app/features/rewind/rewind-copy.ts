import {
	type RewindInsightKind,
	type RewindLanguage,
	type RewindTotals
} from "../../core/models/rewind.model";

export const MIN_REWIND_YEAR = 2000;
export const MAX_REWIND_YEAR = 2100;
export const DEFAULT_REWIND_LANGUAGE: RewindLanguage = "en";

const LOCALE: Record<RewindLanguage, string> = {
	en: "en-US",
	es: "es"
};

export interface RewindSummaryCopy {
	finished: string;
	abandoned: string;
	started: string;
	game: (count: number) => string;
	participle: (verb: string, count: number) => string;
	and: string;
	empty: string;
}

export interface RewindTallyCopy {
	finished: string;
	abandoned: string;
	started: string;
	hoursPlayed: string;
	platinums: string;
	finishRate: string;
	averageRating: string;
	outOf: (value: string, scale: number) => string;
}

export interface RewindHighlightsCopy {
	topRated: string;
	ratedOutOf: (rating: number) => string;
	bestValue: string;
	bestValueHint: string;
	firstOfYear: string;
	lastOfYear: string;
	longest: string;
	fastest: string;
	hoursSuffix: (isEstimate: boolean) => string;
	longestStreak: string;
	monthsInARow: string;
	busiestMonth: string;
	gamesFinished: (count: number) => string;
	topGenres: string;
	platforms: string;
	games: (count: number) => string;
	runs: (count: number) => string;
}

export interface RewindShareCopy {
	shareImage: string;
	downloadImage: string;
	copyLink: string;
	imageFailed: string;
	tryAgain: string;
	preparingImage: string;
	shareFailed: string;
	linkCopied: string;
	copyFailed: string;
}

export interface RewindAiRecapCopy {
	heading: string;
	premiumLabel: string;
	insights: string;
	insightKinds: Record<RewindInsightKind, string>;
	funFact: string;
	nextYearChallenge: (year: number) => string;
}

export interface RewindPremiumStatsCopy {
	heading: string;
	premiumLabel: string;
	hoursByMonth: string;
	hoursByMonthHint: string;
	hours: string;
	month: string;
	tasteVsCritics: string;
	tasteVsCriticsHint: string;
	game: string;
	yourRating: string;
	critics: string;
	gap: string;
	likedMore: string;
	likedLess: string;
	agreed: string;
	backlogFlow: string;
	backlogFlowHint: string;
	added: string;
	finished: string;
	netBalance: string;
	backlogGrew: (count: number) => string;
	backlogShrank: (count: number) => string;
	backlogEven: string;
	genreShare: string;
	genreShareHint: string;
	genre: string;
	games: string;
	share: string;
}

export interface RewindPageCopy {
	ownerEyebrow: string;
	visitorEyebrow: (username: string) => string;
	ownerPreviewAlt: (year: number) => string;
	visitorPreviewAlt: (username: string, year: number) => string;
	share: string;
	year: string;
	yearHeading: string;
	results: string;
	highlights: string;
	finishedIn: (year: number) => string;
	moreRewinds: string;
	seeAll: string;
	loading: string;
	privateTitle: string;
	notAvailableTitle: string;
	notAvailableMessage: string;
	seeAllRewinds: string;
	notGeneratedTitle: string;
	notGeneratedMessage: string;
	backToProfile: string;
	failedTitle: string;
	failedMessage: string;
	tryAgain: string;
}

export interface RewindCopy {
	locale: string;
	page: RewindPageCopy;
	summary: RewindSummaryCopy;
	tally: RewindTallyCopy;
	highlights: RewindHighlightsCopy;
	share: RewindShareCopy;
	aiRecap: RewindAiRecapCopy;
	premiumStats: RewindPremiumStatsCopy;
}

function englishPlural(count: number, singular: string, plural: string) {
	return `${count} ${count === 1 ? singular : plural}`;
}

function spanishPlural(count: number, singular: string, plural: string) {
	return `${formatRewindNumber(count, "es")} ${count === 1 ? singular : plural}`;
}

const ENGLISH: RewindCopy = {
	locale: LOCALE.en,
	page: {
		ownerEyebrow: "Your Rewind",
		visitorEyebrow: username => `@${username}'s Rewind`,
		ownerPreviewAlt: year => `Your ${year} Rewind`,
		visitorPreviewAlt: (username, year) => `@${username}'s ${year} Rewind`,
		share: "Share",
		year: "Year",
		yearHeading: "Rewind year",
		results: "Results",
		highlights: "Highlights",
		finishedIn: year => `Finished in ${year}`,
		moreRewinds: "More Rewinds",
		seeAll: "See all",
		loading: "Loading Rewind",
		privateTitle: "This Rewind is private",
		notAvailableTitle: "This Rewind isn't available",
		notAvailableMessage:
			"Rewinds open on December 1 and only exist for years with games started or finished.",
		seeAllRewinds: "See all Rewinds",
		notGeneratedTitle: "This Rewind hasn't been generated yet",
		notGeneratedMessage:
			"Generate it from your profile. Until then, nobody else can see this year.",
		backToProfile: "Go to your profile",
		failedTitle: "Couldn't load this Rewind",
		failedMessage: "Check your connection and try again.",
		tryAgain: "Try again"
	},
	summary: {
		finished: "finished",
		abandoned: "left behind",
		started: "started",
		game: count => englishPlural(count, "game", "games"),
		participle: verb => verb,
		and: "and",
		empty: "No games this year."
	},
	tally: {
		finished: "Finished",
		abandoned: "Left behind",
		started: "Started",
		hoursPlayed: "Hours played",
		platinums: "Platinums",
		finishRate: "Finish rate",
		averageRating: "Average rating",
		outOf: (value, scale) => `${value} out of ${scale}`
	},
	highlights: {
		topRated: "Top rated",
		ratedOutOf: rating => `Rated ${rating} out of 5`,
		bestValue: "Best value",
		bestValueHint: "Highest score per hour you played",
		firstOfYear: "First of the year",
		lastOfYear: "Last of the year",
		longest: "Longest",
		fastest: "Fastest",
		hoursSuffix: isEstimate => (isEstimate ? "h est." : "h"),
		longestStreak: "Longest streak",
		monthsInARow: " months in a row",
		busiestMonth: "Busiest month",
		gamesFinished: count =>
			`${englishPlural(count, "game", "games")} finished`,
		topGenres: "Top genres",
		platforms: "Platforms",
		games: count => englishPlural(count, "game", "games"),
		runs: count => englishPlural(count, "run", "runs")
	},
	share: {
		shareImage: "Share image",
		downloadImage: "Download image",
		copyLink: "Copy link",
		imageFailed: "Couldn't load the image.",
		tryAgain: "Try again",
		preparingImage: "Preparing the image",
		shareFailed: "Couldn't share the image. Download it instead.",
		linkCopied: "Link copied",
		copyFailed: "Couldn't copy the link."
	},
	aiRecap: {
		heading: "AI recap",
		premiumLabel: "Premium",
		insights: "Insights",
		insightKinds: {
			"taste-vs-critics": "Taste vs. critics",
			"genre-pattern": "Genre pattern",
			"seasonal-rhythm": "Seasonal rhythm",
			"finish-discipline": "Finish discipline",
			"long-vs-short": "Long vs. short",
			"platform-habit": "Platform habit",
			"backlog-comeback": "Backlog comeback"
		},
		funFact: "Fun fact",
		nextYearChallenge: year => `Your ${year} challenge`
	},
	premiumStats: {
		heading: "Premium stats",
		premiumLabel: "Premium",
		hoursByMonth: "Your year's rhythm",
		hoursByMonthHint: "Hours played each month",
		hours: "Hours",
		month: "Month",
		tasteVsCritics: "You vs. the critics",
		tasteVsCriticsHint:
			"Right of the line: you liked it more than the critics",
		game: "Game",
		yourRating: "You",
		critics: "Critics",
		gap: "Gap",
		likedMore: "You liked it more",
		likedLess: "You liked it less",
		agreed: "Same as the critics",
		backlogFlow: "Did your backlog grow or shrink?",
		backlogFlowHint: "Games added vs. games finished each month",
		added: "Added",
		finished: "Finished",
		netBalance: "Net balance",
		backlogGrew: count =>
			`Your backlog grew by ${englishPlural(count, "game", "games")}`,
		backlogShrank: count =>
			`Your backlog shrank by ${englishPlural(count, "game", "games")}`,
		backlogEven: "You finished as many games as you added",
		genreShare: "Genre share",
		genreShareHint: "How your games split across genres",
		genre: "Genre",
		games: "Games",
		share: "Share"
	}
};

const SPANISH: RewindCopy = {
	locale: LOCALE.es,
	page: {
		ownerEyebrow: "Tu Rewind",
		visitorEyebrow: username => `Rewind de @${username}`,
		ownerPreviewAlt: year => `Tu Rewind ${year}`,
		visitorPreviewAlt: (username, year) => `Rewind ${year} de @${username}`,
		share: "Compartir",
		year: "Año",
		yearHeading: "Año del Rewind",
		results: "Resultados",
		highlights: "Lo más destacado",
		finishedIn: year => `Terminados en ${year}`,
		moreRewinds: "Más Rewinds",
		seeAll: "Ver todos",
		loading: "Cargando Rewind",
		privateTitle: "Este Rewind es privado",
		notAvailableTitle: "Este Rewind no está disponible",
		notAvailableMessage:
			"Los Rewinds se abren el 1 de diciembre y solo existen para años con juegos empezados o terminados.",
		seeAllRewinds: "Ver todos los Rewinds",
		notGeneratedTitle: "Este Rewind todavía no se generó",
		notGeneratedMessage:
			"Genéralo desde tu perfil. Hasta entonces, nadie más puede ver este año.",
		backToProfile: "Ir a tu perfil",
		failedTitle: "No pudimos cargar este Rewind",
		failedMessage: "Revisa tu conexión e inténtalo de nuevo.",
		tryAgain: "Reintentar"
	},
	summary: {
		finished: "terminado",
		abandoned: "abandonado",
		started: "empezado",
		game: count => spanishPlural(count, "juego", "juegos"),
		participle: (verb, count) => (count === 1 ? verb : `${verb}s`),
		and: "y",
		empty: "Ningún juego este año."
	},
	tally: {
		finished: "Terminados",
		abandoned: "Abandonados",
		started: "Empezados",
		hoursPlayed: "Horas jugadas",
		platinums: "Platinos",
		finishRate: "Tasa de finalización",
		averageRating: "Nota promedio",
		outOf: (value, scale) => `${value} de ${scale}`
	},
	highlights: {
		topRated: "Mejor calificado",
		ratedOutOf: rating =>
			`Calificado con ${formatRewindNumber(rating, "es")} de 5`,
		bestValue: "Mejor ratio",
		bestValueHint: "Más puntaje por cada hora jugada",
		firstOfYear: "El primero del año",
		lastOfYear: "El último del año",
		longest: "El más largo",
		fastest: "El más corto",
		hoursSuffix: isEstimate => (isEstimate ? "h aprox." : "h"),
		longestStreak: "Racha más larga",
		monthsInARow: " meses seguidos",
		busiestMonth: "Mes más intenso",
		gamesFinished: count =>
			count === 1
				? `${spanishPlural(count, "juego", "juegos")} terminado`
				: `${spanishPlural(count, "juego", "juegos")} terminados`,
		topGenres: "Géneros favoritos",
		platforms: "Plataformas",
		games: count => spanishPlural(count, "juego", "juegos"),
		runs: count => spanishPlural(count, "partida", "partidas")
	},
	share: {
		shareImage: "Compartir imagen",
		downloadImage: "Descargar imagen",
		copyLink: "Copiar enlace",
		imageFailed: "No pudimos cargar la imagen.",
		tryAgain: "Reintentar",
		preparingImage: "Preparando la imagen",
		shareFailed: "No pudimos compartir la imagen. Mejor descárgala.",
		linkCopied: "Enlace copiado",
		copyFailed: "No pudimos copiar el enlace."
	},
	aiRecap: {
		heading: "Resumen con IA",
		premiumLabel: "Premium",
		insights: "Hallazgos",
		insightKinds: {
			"taste-vs-critics": "Tu gusto vs. la crítica",
			"genre-pattern": "Tus géneros",
			"seasonal-rhythm": "Tu ritmo del año",
			"finish-discipline": "Disciplina para terminar",
			"long-vs-short": "Largos vs. cortos",
			"platform-habit": "Tu plataforma",
			"backlog-comeback": "Rescates del backlog"
		},
		funFact: "Dato curioso",
		nextYearChallenge: year => `Tu reto para ${year}`
	},
	premiumStats: {
		heading: "Estadísticas Premium",
		premiumLabel: "Premium",
		hoursByMonth: "El ritmo de tu año",
		hoursByMonthHint: "Horas jugadas cada mes",
		hours: "Horas",
		month: "Mes",
		tasteVsCritics: "Tú vs. la crítica",
		tasteVsCriticsHint:
			"A la derecha de la línea: te gustó más que a la crítica",
		game: "Juego",
		yourRating: "Tú",
		critics: "Crítica",
		gap: "Diferencia",
		likedMore: "Te gustó más",
		likedLess: "Te gustó menos",
		agreed: "Igual que la crítica",
		backlogFlow: "¿Tu backlog creció o se achicó?",
		backlogFlowHint: "Juegos agregados vs. terminados cada mes",
		added: "Agregados",
		finished: "Terminados",
		netBalance: "Balance del año",
		backlogGrew: count =>
			`Tu backlog creció ${spanishPlural(count, "juego", "juegos")}`,
		backlogShrank: count =>
			`Tu backlog se achicó ${spanishPlural(count, "juego", "juegos")}`,
		backlogEven: "Terminaste tantos juegos como agregaste",
		genreShare: "Reparto por género",
		genreShareHint: "Cómo se repartieron tus juegos entre géneros",
		genre: "Género",
		games: "Juegos",
		share: "Porcentaje"
	}
};

export const REWIND_COPY: Record<RewindLanguage, RewindCopy> = {
	en: ENGLISH,
	es: SPANISH
};

export function rewindCopy(
	language: RewindLanguage | null | undefined
): RewindCopy {
	return language && Object.hasOwn(REWIND_COPY, language)
		? REWIND_COPY[language]
		: REWIND_COPY[DEFAULT_REWIND_LANGUAGE];
}

function localeOf(language: RewindLanguage): string {
	return rewindCopy(language).locale;
}

export function parseRewindYear(raw: string | null): number | null {
	if (!raw || !/^\d{4}$/.test(raw)) return null;
	const year = Number(raw);
	return year >= MIN_REWIND_YEAR && year <= MAX_REWIND_YEAR ? year : null;
}

export function pluralize(count: number, singular: string, plural: string) {
	return englishPlural(count, singular, plural);
}

export function rewindSummarySentence(
	totals: RewindTotals,
	language: RewindLanguage = DEFAULT_REWIND_LANGUAGE
): string {
	const copy = rewindCopy(language).summary;
	const parts = [
		{ count: totals.finished, verb: copy.finished },
		{ count: totals.abandoned, verb: copy.abandoned },
		{ count: totals.started, verb: copy.started }
	].filter(part => part.count > 0);
	if (parts.length === 0) return copy.empty;
	const [lead, ...rest] = parts;
	const leadPhrase = `${copy.game(lead.count)} ${copy.participle(lead.verb, lead.count)}`;
	const restPhrases = rest.map(
		part =>
			`${formatRewindNumber(part.count, language)} ${copy.participle(part.verb, part.count)}`
	);
	return `${joinWithAnd([leadPhrase, ...restPhrases], copy.and)}.`;
}

function joinWithAnd(parts: string[], and: string): string {
	if (parts.length === 1) return parts[0];
	return `${parts.slice(0, -1).join(", ")} ${and} ${parts.at(-1)}`;
}

function capitalize(text: string, locale: string): string {
	return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}

function isMonth(month: number): boolean {
	return Number.isInteger(month) && month >= 1 && month <= 12;
}

function rawMonthName(
	month: number,
	language: RewindLanguage,
	width: "long" | "short"
): string {
	if (!isMonth(month)) return "";
	return new Intl.DateTimeFormat(localeOf(language), {
		month: width,
		timeZone: "UTC"
	})
		.format(new Date(Date.UTC(2000, month - 1, 1)))
		.replace(/\.$/, "");
}

export function monthName(
	month: number,
	language: RewindLanguage = DEFAULT_REWIND_LANGUAGE
): string {
	return capitalize(
		rawMonthName(month, language, "long"),
		localeOf(language)
	);
}

export function shortMonthName(
	month: number,
	language: RewindLanguage = DEFAULT_REWIND_LANGUAGE
): string {
	return capitalize(
		rawMonthName(month, language, "short"),
		localeOf(language)
	);
}

export function monthRange(
	fromMonth: number,
	toMonth: number,
	language: RewindLanguage = DEFAULT_REWIND_LANGUAGE
): string {
	return `${shortMonthName(fromMonth, language)}–${shortMonthName(toMonth, language)}`;
}

export function spokenMonthRange(
	fromMonth: number,
	toMonth: number,
	language: RewindLanguage = DEFAULT_REWIND_LANGUAGE
): string {
	if (language === "es") {
		return `${monthName(fromMonth, language)} a ${rawMonthName(toMonth, language, "long")}`;
	}
	return `${monthName(fromMonth, language)} to ${monthName(toMonth, language)}`;
}

export function utcMonth(isoDate: string): number {
	return new Date(isoDate).getUTCMonth() + 1;
}

export function shortDate(
	isoDate: string,
	language: RewindLanguage = DEFAULT_REWIND_LANGUAGE
): string {
	return new Date(isoDate)
		.toLocaleDateString(localeOf(language), {
			month: "short",
			day: "numeric",
			timeZone: "UTC"
		})
		.replace(/\.$/, "");
}

export function formatRewindNumber(
	value: number,
	language: RewindLanguage = DEFAULT_REWIND_LANGUAGE,
	fractionDigits: { min: number; max: number } = { min: 0, max: 1 }
): string {
	return new Intl.NumberFormat(localeOf(language), {
		minimumFractionDigits: fractionDigits.min,
		maximumFractionDigits: fractionDigits.max
	}).format(value);
}

export function formatHours(
	hours: number,
	language: RewindLanguage = DEFAULT_REWIND_LANGUAGE
): string {
	return formatRewindNumber(hours, language);
}

export function formatPercent(
	percent: number,
	language: RewindLanguage = DEFAULT_REWIND_LANGUAGE
): string {
	return new Intl.NumberFormat(localeOf(language), {
		style: "percent",
		maximumFractionDigits: 0
	}).format(percent / 100);
}

export function formatRating(
	rating: number,
	language: RewindLanguage = DEFAULT_REWIND_LANGUAGE
): string {
	return formatRewindNumber(rating, language, { min: 1, max: 1 });
}

export function rewindImageFileName(username: string, year: number): string {
	return `completr-rewind-${username}-${year}.png`;
}
