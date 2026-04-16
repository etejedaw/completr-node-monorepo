"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query(`
			DO $$ BEGIN
				CREATE TYPE "enum_Users_role" AS ENUM ('user', 'premium', 'moderator', 'admin');
			EXCEPTION WHEN duplicate_object THEN null; END $$;

			DO $$ BEGIN
				CREATE TYPE "enum_GameTimes_source" AS ENUM ('hltb', 'rawg', 'completr');
			EXCEPTION WHEN duplicate_object THEN null; END $$;

			DO $$ BEGIN
				CREATE TYPE "enum_GameExternals_source" AS ENUM ('rawg', 'igdb', 'steam', 'hltb', 'metacritic', 'opencritic');
			EXCEPTION WHEN duplicate_object THEN null; END $$;

			DO $$ BEGIN
				CREATE TYPE "enum_Backlogs_status" AS ENUM ('not_started', 'playing', 'completed', 'abandoned');
			EXCEPTION WHEN duplicate_object THEN null; END $$;

			DO $$ BEGIN
				CREATE TYPE "enum_Lists_scoreSource" AS ENUM ('metacritic', 'opencritic', 'rawg', 'completr');
			EXCEPTION WHEN duplicate_object THEN null; END $$;

			DO $$ BEGIN
				CREATE TYPE "enum_Lists_durationSource" AS ENUM ('hltb', 'rawg', 'completr');
			EXCEPTION WHEN duplicate_object THEN null; END $$;

			DO $$ BEGIN
				CREATE TYPE "enum_SavedFilters_sortOrder" AS ENUM ('asc', 'desc');
			EXCEPTION WHEN duplicate_object THEN null; END $$;

			DO $$ BEGIN
				CREATE TYPE "enum_GameReports_status" AS ENUM ('pending', 'approved', 'rejected');
			EXCEPTION WHEN duplicate_object THEN null; END $$;

			CREATE TABLE IF NOT EXISTS "Users" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				username VARCHAR(15) UNIQUE NOT NULL,
				email VARCHAR(255) UNIQUE NOT NULL,
				password VARCHAR(255) NOT NULL,
				role "enum_Users_role" DEFAULT 'user' NOT NULL,
				name VARCHAR(80),
				bio VARCHAR(250),
				"avatarUrl" VARCHAR(255),
				"isPublic" BOOLEAN DEFAULT true,
				"isWishlistPublic" BOOLEAN DEFAULT true,
				"isFavoritePublic" BOOLEAN DEFAULT true,
				"isFeedPublic" BOOLEAN DEFAULT true,
				"isActive" BOOLEAN DEFAULT true,
				"createdAt" TIMESTAMPTZ NOT NULL,
				"updatedAt" TIMESTAMPTZ NOT NULL
			);

			CREATE TABLE IF NOT EXISTS "Platforms" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				name VARCHAR(100) NOT NULL,
				code VARCHAR(100) UNIQUE NOT NULL,
				abbreviation VARCHAR(10) UNIQUE NOT NULL,
				description VARCHAR(255),
				manufacturer VARCHAR(100) NOT NULL,
				generation SMALLINT,
				"logoUrl" VARCHAR(255),
				"releaseAt" DATE,
				"createdAt" TIMESTAMPTZ NOT NULL,
				"updatedAt" TIMESTAMPTZ NOT NULL
			);

			CREATE TABLE IF NOT EXISTS "Genres" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				name VARCHAR(50) UNIQUE NOT NULL,
				code VARCHAR(50) UNIQUE NOT NULL
			);

			CREATE TABLE IF NOT EXISTS "ScoreSources" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				code VARCHAR(50) UNIQUE NOT NULL,
				name VARCHAR(100) NOT NULL,
				scale INTEGER NOT NULL,
				"createdAt" TIMESTAMPTZ NOT NULL,
				"updatedAt" TIMESTAMPTZ NOT NULL
			);

			CREATE TABLE IF NOT EXISTS "Games" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				title VARCHAR(200) NOT NULL,
				code VARCHAR(200) UNIQUE NOT NULL,
				description TEXT,
				"releaseAt" DATE,
				"coverUrl" VARCHAR(255),
				"backgroundUrl" VARCHAR(255),
				"isDlc" BOOLEAN DEFAULT false,
				"parentGameId" UUID REFERENCES "Games"(id),
				"isActive" BOOLEAN DEFAULT true,
				"createdAt" TIMESTAMPTZ NOT NULL,
				"updatedAt" TIMESTAMPTZ NOT NULL
			);

			CREATE TABLE IF NOT EXISTS "GamePlatforms" (
				"gameId" UUID NOT NULL REFERENCES "Games"(id),
				"platformId" UUID NOT NULL REFERENCES "Platforms"(id),
				PRIMARY KEY ("gameId", "platformId")
			);

			CREATE TABLE IF NOT EXISTS "GameGenres" (
				"gameId" UUID NOT NULL REFERENCES "Games"(id),
				"genreId" UUID NOT NULL REFERENCES "Genres"(id),
				PRIMARY KEY ("gameId", "genreId")
			);

			CREATE TABLE IF NOT EXISTS "GameScores" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"gameId" UUID NOT NULL REFERENCES "Games"(id),
				source VARCHAR(50) NOT NULL,
				score FLOAT NOT NULL,
				"updatedAt" TIMESTAMPTZ NOT NULL,
				UNIQUE ("gameId", source)
			);

			CREATE TABLE IF NOT EXISTS "GameTimes" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"gameId" UUID NOT NULL REFERENCES "Games"(id),
				source "enum_GameTimes_source" NOT NULL,
				duration FLOAT NOT NULL,
				"updatedAt" TIMESTAMPTZ NOT NULL,
				UNIQUE ("gameId", source)
			);

			CREATE TABLE IF NOT EXISTS "GameExternals" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"gameId" UUID NOT NULL REFERENCES "Games"(id),
				source "enum_GameExternals_source" NOT NULL,
				"externalId" VARCHAR(255) NOT NULL,
				"createdAt" TIMESTAMPTZ NOT NULL,
				"updatedAt" TIMESTAMPTZ NOT NULL,
				UNIQUE (source, "externalId"),
				UNIQUE ("gameId", source)
			);

			CREATE TABLE IF NOT EXISTS "GameShelves" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"userId" UUID NOT NULL REFERENCES "Users"(id),
				"gameId" UUID NOT NULL REFERENCES "Games"(id),
				"platformId" UUID NOT NULL REFERENCES "Platforms"(id),
				"isPublic" BOOLEAN DEFAULT true,
				"acquiredAt" DATE,
				edition VARCHAR(100),
				notes VARCHAR(100),
				"createdAt" TIMESTAMPTZ NOT NULL,
				"updatedAt" TIMESTAMPTZ NOT NULL
			);

			CREATE TABLE IF NOT EXISTS "Backlogs" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"userId" UUID NOT NULL REFERENCES "Users"(id),
				"gameId" UUID NOT NULL REFERENCES "Games"(id),
				"platformId" UUID NOT NULL REFERENCES "Platforms"(id),
				status "enum_Backlogs_status" DEFAULT 'not_started' NOT NULL,
				"startedAt" DATE,
				"finishedAt" DATE,
				"realDuration" FLOAT,
				score FLOAT,
				duration FLOAT,
				"userRating" FLOAT,
				"isPublic" BOOLEAN DEFAULT true,
				notes TEXT,
				"createdAt" TIMESTAMPTZ NOT NULL,
				"updatedAt" TIMESTAMPTZ NOT NULL
			);

			CREATE TABLE IF NOT EXISTS "Wishlists" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"userId" UUID NOT NULL REFERENCES "Users"(id),
				"backlogId" UUID NOT NULL REFERENCES "Backlogs"(id),
				position INTEGER NOT NULL,
				"createdAt" TIMESTAMPTZ NOT NULL,
				"updatedAt" TIMESTAMPTZ NOT NULL,
				UNIQUE ("userId", "backlogId")
			);

			CREATE TABLE IF NOT EXISTS "Favorites" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"userId" UUID NOT NULL REFERENCES "Users"(id),
				"gameId" UUID NOT NULL REFERENCES "Games"(id),
				position INTEGER NOT NULL,
				"createdAt" TIMESTAMPTZ NOT NULL,
				"updatedAt" TIMESTAMPTZ NOT NULL,
				UNIQUE ("userId", "gameId")
			);

			CREATE TABLE IF NOT EXISTS "Lists" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"userId" UUID NOT NULL REFERENCES "Users"(id),
				name VARCHAR(100) NOT NULL,
				description TEXT,
				"isPublic" BOOLEAN DEFAULT false,
				"scoreSource" "enum_Lists_scoreSource" NOT NULL,
				"durationSource" "enum_Lists_durationSource" NOT NULL,
				"createdAt" TIMESTAMPTZ NOT NULL,
				"updatedAt" TIMESTAMPTZ NOT NULL
			);

			CREATE TABLE IF NOT EXISTS "ListItems" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"listId" UUID NOT NULL REFERENCES "Lists"(id) ON DELETE CASCADE,
				"gameId" UUID NOT NULL REFERENCES "Games"(id),
				position INTEGER NOT NULL DEFAULT 0,
				score FLOAT,
				duration FLOAT,
				"createdAt" TIMESTAMPTZ NOT NULL,
				"updatedAt" TIMESTAMPTZ NOT NULL
			);

			CREATE TABLE IF NOT EXISTS "ListFollowers" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"listId" UUID NOT NULL REFERENCES "Lists"(id) ON DELETE CASCADE,
				"userId" UUID NOT NULL REFERENCES "Users"(id),
				"isVisible" BOOLEAN DEFAULT true,
				"createdAt" TIMESTAMPTZ NOT NULL,
				"updatedAt" TIMESTAMPTZ NOT NULL,
				UNIQUE ("listId", "userId")
			);

			CREATE TABLE IF NOT EXISTS "SavedFilters" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"userId" UUID NOT NULL REFERENCES "Users"(id),
				name VARCHAR(100) NOT NULL,
				description VARCHAR(255),
				filters JSONB NOT NULL,
				"sortBy" VARCHAR(50),
				"sortOrder" "enum_SavedFilters_sortOrder" DEFAULT 'desc' NOT NULL,
				"showInBacklog" BOOLEAN DEFAULT true NOT NULL,
				"isDefault" BOOLEAN DEFAULT false NOT NULL,
				"createdAt" TIMESTAMPTZ NOT NULL,
				"updatedAt" TIMESTAMPTZ NOT NULL
			);

			CREATE TABLE IF NOT EXISTS "RefreshTokens" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"userId" UUID NOT NULL REFERENCES "Users"(id),
				token VARCHAR(255) UNIQUE NOT NULL,
				"expiresAt" TIMESTAMPTZ NOT NULL,
				"createdAt" TIMESTAMPTZ NOT NULL,
				"updatedAt" TIMESTAMPTZ NOT NULL
			);

			CREATE TABLE IF NOT EXISTS "GameReports" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"gameId" UUID NOT NULL REFERENCES "Games"(id),
				"userId" UUID NOT NULL REFERENCES "Users"(id),
				message TEXT NOT NULL,
				status "enum_GameReports_status" DEFAULT 'pending' NOT NULL,
				"createdAt" TIMESTAMPTZ NOT NULL,
				"updatedAt" TIMESTAMPTZ NOT NULL,
				UNIQUE ("gameId", "userId")
			);

			CREATE TABLE IF NOT EXISTS "UserFollowers" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"followerId" UUID NOT NULL REFERENCES "Users"(id),
				"followingId" UUID NOT NULL REFERENCES "Users"(id),
				"createdAt" TIMESTAMPTZ NOT NULL,
				"updatedAt" TIMESTAMPTZ NOT NULL,
				UNIQUE ("followerId", "followingId")
			);

			CREATE TABLE IF NOT EXISTS "Activities" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"userId" UUID NOT NULL REFERENCES "Users"(id),
				type VARCHAR(50) NOT NULL,
				"createdAt" TIMESTAMPTZ NOT NULL,
				"updatedAt" TIMESTAMPTZ NOT NULL
			);

			CREATE INDEX IF NOT EXISTS "activities_userid_createdat_idx" ON "Activities" ("userId", "createdAt");

			CREATE TABLE IF NOT EXISTS "ActivityGames" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"activityId" UUID NOT NULL UNIQUE REFERENCES "Activities"(id) ON DELETE CASCADE,
				"gameId" UUID NOT NULL REFERENCES "Games"(id)
			);

			CREATE TABLE IF NOT EXISTS "ActivityLists" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"activityId" UUID NOT NULL UNIQUE REFERENCES "Activities"(id) ON DELETE CASCADE,
				"listId" UUID NOT NULL REFERENCES "Lists"(id)
			);

			CREATE TABLE IF NOT EXISTS "ActivityUsers" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"activityId" UUID NOT NULL UNIQUE REFERENCES "Activities"(id) ON DELETE CASCADE,
				"targetUserId" UUID NOT NULL REFERENCES "Users"(id)
			);

			CREATE TABLE IF NOT EXISTS "AuditLogs" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"userId" UUID NOT NULL REFERENCES "Users"(id),
				action VARCHAR(50) NOT NULL,
				"targetType" VARCHAR(30) NOT NULL,
				"targetId" VARCHAR(255) NOT NULL,
				"createdAt" TIMESTAMPTZ NOT NULL
			);

			CREATE TABLE IF NOT EXISTS "Reviews" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"userId" UUID NOT NULL REFERENCES "Users"(id),
				"gameId" UUID NOT NULL REFERENCES "Games"(id),
				content TEXT,
				rating FLOAT,
				"createdAt" TIMESTAMPTZ NOT NULL,
				"updatedAt" TIMESTAMPTZ NOT NULL,
				UNIQUE ("userId", "gameId")
			);

			CREATE TABLE IF NOT EXISTS "Jobs" (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				type VARCHAR(50) NOT NULL,
				status VARCHAR(20) DEFAULT 'pending' NOT NULL,
				result TEXT,
				"completedAt" TIMESTAMPTZ,
				"createdAt" TIMESTAMPTZ NOT NULL,
				"updatedAt" TIMESTAMPTZ NOT NULL
			);
		`);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(`
			DROP TABLE IF EXISTS "Jobs";
			DROP TABLE IF EXISTS "Reviews";
			DROP TABLE IF EXISTS "AuditLogs";
			DROP TABLE IF EXISTS "ActivityUsers";
			DROP TABLE IF EXISTS "ActivityLists";
			DROP TABLE IF EXISTS "ActivityGames";
			DROP TABLE IF EXISTS "Activities";
			DROP TABLE IF EXISTS "UserFollowers";
			DROP TABLE IF EXISTS "GameReports";
			DROP TABLE IF EXISTS "RefreshTokens";
			DROP TABLE IF EXISTS "SavedFilters";
			DROP TABLE IF EXISTS "ListFollowers";
			DROP TABLE IF EXISTS "ListItems";
			DROP TABLE IF EXISTS "Lists";
			DROP TABLE IF EXISTS "Favorites";
			DROP TABLE IF EXISTS "Wishlists";
			DROP TABLE IF EXISTS "Backlogs";
			DROP TABLE IF EXISTS "GameShelves";
			DROP TABLE IF EXISTS "GameExternals";
			DROP TABLE IF EXISTS "GameTimes";
			DROP TABLE IF EXISTS "GameScores";
			DROP TABLE IF EXISTS "GameGenres";
			DROP TABLE IF EXISTS "GamePlatforms";
			DROP TABLE IF EXISTS "Games";
			DROP TABLE IF EXISTS "ScoreSources";
			DROP TABLE IF EXISTS "Genres";
			DROP TABLE IF EXISTS "Platforms";
			DROP TABLE IF EXISTS "Users";

			DROP TYPE IF EXISTS "enum_GameReports_status";
			DROP TYPE IF EXISTS "enum_SavedFilters_sortOrder";
			DROP TYPE IF EXISTS "enum_Lists_durationSource";
			DROP TYPE IF EXISTS "enum_Lists_scoreSource";
			DROP TYPE IF EXISTS "enum_Backlogs_status";
			DROP TYPE IF EXISTS "enum_GameExternals_source";
			DROP TYPE IF EXISTS "enum_GameTimes_source";
			DROP TYPE IF EXISTS "enum_Users_role";
		`);
	}
};
