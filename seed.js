
const fs = require("fs");
const path = require("path");

function seed(db) {
  const file = path.join(__dirname, "data", "internships-seed.json");
  const { internships } = JSON.parse(fs.readFileSync(file, "utf8"));
  const insert = db.prepare(`INSERT OR IGNORE INTO internships (id, title, domain, mode, location, skills, openings)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  let added = 0;
  for (const i of internships) {
    added += insert.run(i.id, i.title, i.domain, i.mode, i.location, JSON.stringify(i.skills), i.openings).changes;
  }
  return added;
}

module.exports = { seed };

if (require.main === module) {
  console.log("Seed finished. " + seed(require("./db")) + " new record(s) added.");
}
