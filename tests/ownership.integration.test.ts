import assert from "node:assert/strict";
import { test } from "node:test";
import { initDb, closeDb, query, queryOne } from "../src/db/postgres.js";
import { updateOwner, canCreateChannel } from "../src/services/VoiceService.js";
import { withOwnerLock } from "../src/services/OwnershipService.js";
import { upsertConfigFull, getConfig } from "../src/services/ConfigService.js";

const url = process.env.TEST_DATABASE_URL;

test(
  "PostgreSQL ownership isolation, concurrency and lock release",
  { skip: !url },
  async () => {
    assert.match(new URL(url!).pathname, /^\/voicebot_regression_\d+$/);
    process.env.DATABASE_URL = url;
    try {
      await initDb();
      await initDb();
      await query(
        "TRUNCATE voice_channels, guild_config, cooldowns, voice_channel_whitelist",
      );
      for (const guild of ["a", "b"])
        await upsertConfigFull(guild, { cooldownSeconds: 0 });
      for (const [id, guild, owner] of [
        ["1", "a", "alice"],
        ["2", "a", "bob"],
        ["3", "a", "carol"],
        ["4", "b", "bob"],
      ]) {
        await query(
          `INSERT INTO voice_channels ("voiceChannelId", "guildId", "ownerId", "textChannelId", "createdAt", "lastOwnerSeenAt") VALUES ($1, $2, $3, $4, 1, 1)`,
          [id, guild, owner, `text-${id}`],
        );
      }
      const config = (await getConfig("a"))!;
      assert.equal(
        (await canCreateChannel("a", "alice", config)).allowed,
        false,
      );
      assert.equal(
        (await canCreateChannel("b", "alice", config)).allowed,
        true,
      );
      await assert.rejects(updateOwner("2", "alice"), /already owns/);
      await updateOwner("4", "alice");
      assert.equal(
        (await canCreateChannel("b", "alice", config)).allowed,
        false,
      );

      const results = await Promise.allSettled([
        updateOwner("2", "dave"),
        updateOwner("3", "dave"),
      ]);
      assert.equal(
        results.filter((result) => result.status === "fulfilled").length,
        1,
      );
      const count = await queryOne<{ count: string }>(
        `SELECT COUNT(*) AS count FROM voice_channels WHERE "guildId" = 'a' AND "ownerId" = 'dave'`,
      );
      assert.equal(count?.count, "1");

      await assert.rejects(
        withOwnerLock("a", "failure", async () => {
          throw new Error("Expected failure");
        }),
        /Expected failure/,
      );
      await withOwnerLock("a", "failure", async () => {
        await query("SELECT 1");
      });
      await Promise.all(
        Array.from({ length: 12 }, () =>
          withOwnerLock("a", "busy", async () => {
            await query("SELECT 1");
          }),
        ),
      );
    } finally {
      await closeDb();
    }
  },
);
