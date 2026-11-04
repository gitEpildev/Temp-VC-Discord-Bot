import { getPool, databaseConnection } from "../db/postgres.js";

export async function withOwnerLock<T>(
  guildId: string,
  userId: string,
  action: () => Promise<T>,
): Promise<T> {
  const connection = await getPool().connect();
  let locked = false;
  try {
    // Share the same lock across creation, transfer and claim.
    await connection.query(
      "SELECT pg_advisory_lock(hashtext($1), hashtext($2))",
      [guildId, userId],
    );
    locked = true;
    return await databaseConnection.run(connection, action);
  } finally {
    try {
      if (locked)
        await connection.query(
          "SELECT pg_advisory_unlock(hashtext($1), hashtext($2))",
          [guildId, userId],
        );
      connection.release();
    } catch (error) {
      connection.release(true);
      console.error("Owner lock release failed:", error);
    }
  }
}
