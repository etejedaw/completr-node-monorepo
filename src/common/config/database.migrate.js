module.exports = {
	dev: {
		host: process.env.PG_HOST || "127.0.0.1",
		port: process.env.PG_PORT || 5432,
		username: process.env.PG_USER || "root",
		password: process.env.PG_PASSWORD || "toor",
		database: process.env.PG_DATABASE || "postgres",
		dialect: "postgres"
	},
	stg: {
		host: process.env.PG_HOST,
		port: process.env.PG_PORT,
		username: process.env.PG_USER,
		password: process.env.PG_PASSWORD,
		database: process.env.PG_DATABASE,
		dialect: "postgres"
	},
	prd: {
		host: process.env.PG_HOST,
		port: process.env.PG_PORT,
		username: process.env.PG_USER,
		password: process.env.PG_PASSWORD,
		database: process.env.PG_DATABASE,
		dialect: "postgres"
	}
};
