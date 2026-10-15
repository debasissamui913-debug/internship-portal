
const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");
const path = require("path");

const file = process.env.DB_PATH || path.join(__dirname, "data", "internships.db");
const db = new DatabaseSync(file);

db.exec("PRAGMA foreign_keys = ON");
db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

module.exports = db;
