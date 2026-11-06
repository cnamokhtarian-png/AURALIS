import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
const db = await PGlite.create({ dataDir: "/tmp/pgdata" });
for (const file of process.argv.slice(2)) { await db.exec(fs.readFileSync(file, "utf8")); console.log("applied", file); }
await db.close();
