import "dotenv/config";
import { initDb, closeDb } from "./postgres.js";

async function main(): Promise<void> {
  try {
    await initDb();
    console.log("Migrations completed successfully.");
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
