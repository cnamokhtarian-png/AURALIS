import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { randomBytes, scryptSync } from "node:crypto";
const db = await PGlite.create({ dataDir: "/tmp/pgdata" });
if (process.env.SEED_ADMIN) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync("admin1234", salt, 64).toString("hex");
  await db.query(`insert into users (name,email,password_hash,role) values ($1,$2,$3,'admin') on conflict (email) do update set password_hash=excluded.password_hash`, ["مدیر آورالیس","admin@auralis.ir",`${salt}:${hash}`]);
  console.log("admin seeded");
}
const server = new PGLiteSocketServer({ db, port: 5433, host: "127.0.0.1", maxConnections: 10 });
await server.start();
console.log("PGLITE_READY");
