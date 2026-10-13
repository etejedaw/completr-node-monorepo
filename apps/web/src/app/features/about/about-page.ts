import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";

import {
	FEEDBACK_EMAIL,
	InfoPageLinks
} from "../../shared/components/info-page-links/info-page-links";
import { LibraryHero } from "../../shared/components/library-hero/library-hero";
import { UiButton } from "../../shared/ui";
import { injectLibraryPosters } from "../backlog/library-posters";

interface DataSource {
	name: string;
	url: string;
	provides: string;
}

const REPOSITORY_URL = "https://github.com/etejedaw/completr-node-monorepo";

const DATA_SOURCES: readonly DataSource[] = [
	{
		name: "RAWG",
		url: "https://rawg.io",
		provides: "Game catalog, artwork and community ratings"
	},
	{
		name: "HowLongToBeat",
		url: "https://howlongtobeat.com",
		provides: "How long games take to beat"
	},
	{
		name: "Metacritic",
		url: "https://www.metacritic.com",
		provides: "Critic scores"
	}
];

const STACK = [
	"Angular",
	"Tailwind CSS",
	"Node.js",
	"Express",
	"PostgreSQL",
	"Sequelize",
	"Zod"
] as const;

@Component({
	selector: "app-about-page",
	imports: [RouterLink, LibraryHero, InfoPageLinks, UiButton],
	templateUrl: "./about-page.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutPage {
	protected readonly posters = injectLibraryPosters();
	protected readonly dataSources = DATA_SOURCES;
	protected readonly stack = STACK;
	protected readonly repositoryUrl = REPOSITORY_URL;
	protected readonly issuesUrl = `${REPOSITORY_URL}/issues`;
	protected readonly feedbackEmail = FEEDBACK_EMAIL;
}
