const db = require("./db");
const { seed } = require("./seed");
const { createApp } = require("./app");


if (db.prepare("SELECT COUNT(*) AS c FROM internships").get().c === 0) seed(db);

const PORT = process.env.PORT || 3000;
createApp().listen(PORT, () => console.log("Portal running at http://localhost:" + PORT));
