import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { initDb, closeDb, query } from "../dist/db/postgres.js";
import { upsertConfigFull, getConfig } from "../dist/services/ConfigService.js";
import { canCreateChannel } from "../dist/services/VoiceService.js";
import { deleteEmptyRoom } from "../dist/services/ChannelSafetyService.js";
import { buildControlPanelEmbed } from "../dist/ui/controlPanel.js";
import { buildInviteUrl } from "../dist/utils/invite.js";

assert.ok(process.env.SMOKE_DATABASE_URL, "SMOKE_DATABASE_URL is required.");
assert.match(
  new URL(process.env.SMOKE_DATABASE_URL).pathname,
  /^\/voicebot_regression_\d+$/,
);
assert.ok(!process.env.BOT_TOKEN, "Smoke checks must not use a Discord token.");
process.env.DATABASE_URL = process.env.SMOKE_DATABASE_URL;

const root = new URL("../", import.meta.url);
const startup = spawnSync(
  process.execPath,
  [fileURLToPath(new URL("dist/index.js", root))],
  {
    cwd: fileURLToPath(root),
    env: { PATH: process.env.PATH, NODE_ENV: "test", BOT_TOKEN: "" },
    encoding: "utf8",
    timeout: 10000,
  },
);
assert.equal(startup.error, undefined);
assert.equal(startup.status, 1);
assert.match(startup.stderr, /BOT_TOKEN is required/);
assert.match(
  readFileSync(new URL("LICENSE", root), "utf8"),
  /Epildevconnect Ltd/,
);

try {
  await initDb();
  await initDb();
  await upsertConfigFull("smoke-a", { cooldownSeconds: 0 });
  await upsertConfigFull("smoke-b", { cooldownSeconds: 0 });
  const config = await getConfig("smoke-a");
  assert.ok(config);
  await query(`INSERT INTO voice_channels ("voiceChannelId", "guildId", "textChannelId", "ownerId", "createdAt", "lastOwnerSeenAt", "controlPanelMessageId")
    VALUES ('smoke-voice', 'smoke-a', 'smoke-text', 'smoke-owner', 1, 1, 'smoke-panel')
    ON CONFLICT ("voiceChannelId") DO NOTHING`);
  assert.equal(
    (await canCreateChannel("smoke-a", "smoke-owner", config)).allowed,
    false,
  );
  assert.equal(
    (await canCreateChannel("smoke-b", "smoke-owner", config)).allowed,
    true,
  );
  assert.equal(await deleteEmptyRoom({}, "1554548888289943663"), false);
  assert.equal(await deleteEmptyRoom({}, "1554548892023005224"), false);
  const embed = buildControlPanelEmbed(config, "Epildev", 1).toJSON();
  assert.equal(embed.footer.text, "✧ Epildev's Voice");
  assert.equal(embed.timestamp, new Date(1).toISOString());
  assert.equal(
    new URL(buildInviteUrl("1476740098711224352")).searchParams.get(
      "permissions",
    ),
    "281475267251216",
  );
  console.log(
    "Production smoke passed: startup, licence, migrations, ownership, protected channels, panel and invite.",
  );
} finally {
  await closeDb();
}
