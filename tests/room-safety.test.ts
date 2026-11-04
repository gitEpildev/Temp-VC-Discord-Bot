import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { ChannelType, Collection, type Guild } from "discord.js";
import { getPool } from "../src/db/postgres.js";
import {
  deleteEmptyRoom,
  fetchChannel,
  scheduleEmptyRoomDeletion,
} from "../src/services/ChannelSafetyService.js";
import { hasDeleteTimer, cancelDelete } from "../src/utils/timers.js";
import { buildControlPanelEmbed } from "../src/ui/controlPanel.js";
import { canCreateChannel } from "../src/services/VoiceService.js";
import type { GuildConfig } from "../src/db/postgres.js";

process.env.DATABASE_URL = "postgresql://unused:unused@localhost/unused";
const config = {
  guildId: "server-a",
  enabled: 1,
  cooldownSeconds: 0,
  brandColor: "#5865F2",
  maxChannelsPerUser: 10,
} as GuildConfig;
const row = {
  voiceChannelId: "voice",
  textChannelId: "text",
  guildId: "server-a",
  ownerId: "owner",
};

afterEach(() => {
  mock.restoreAll();
  cancelDelete("voice");
});

function fixture() {
  const deleted: string[] = [];
  const sql: string[] = [];
  const states = new Collection<string, { channelId: string; bot?: boolean }>();
  const guild = {
    id: "server-a",
    available: true,
    client: { isReady: () => true },
    voiceStates: { cache: states },
    channels: {
      fetch: async (id: string) => ({
        id,
        type: id === "voice" ? ChannelType.GuildVoice : ChannelType.GuildText,
        delete: async () => {
          deleted.push(id);
        },
      }),
    },
  } as unknown as Guild;
  mock.method(getPool(), "query", async (statement: string) => {
    sql.push(statement);
    return {
      rows: statement.includes("SELECT * FROM voice_channels")
        ? [row]
        : statement.includes("SELECT * FROM guild_config")
          ? [config]
          : [],
    };
  });
  return { guild, deleted, sql, states };
}

test("protected voice and text IDs never reach Discord or the database", async () => {
  const { guild, deleted, sql } = fixture();
  for (const id of ["1554548888289943663", "1554548892023005224"]) {
    assert.equal(await deleteEmptyRoom(guild, id), false);
    scheduleEmptyRoomDeletion(guild, id, 1);
    assert.equal(hasDeleteTimer(id), false);
  }
  assert.deepEqual(deleted, []);
  assert.deepEqual(sql, []);
});

for (const bot of [false, true]) {
  test(`an occupied room is retained, bot=${bot}`, async () => {
    const { guild, states, deleted, sql } = fixture();
    states.set("occupant", { channelId: "voice", bot });
    assert.equal(await deleteEmptyRoom(guild, "voice"), false);
    assert.deepEqual(deleted, []);
    assert.ok(!sql.some((statement) => statement.startsWith("DELETE")));
  });
}

test("a participant arriving during channel fetch prevents deletion", async () => {
  const { guild, states, deleted } = fixture();
  const fetch = guild.channels.fetch.bind(guild.channels);
  mock.method(guild.channels, "fetch", async (id: string) => {
    if (id === "text") states.set("newcomer", { channelId: "voice" });
    return fetch(id);
  });
  assert.equal(await deleteEmptyRoom(guild, "voice"), false);
  assert.deepEqual(deleted, []);
});

test("empty managed rooms delete channels before their records", async () => {
  const { guild, deleted, sql } = fixture();
  assert.equal(await deleteEmptyRoom(guild, "voice"), true);
  assert.deepEqual(deleted, ["voice", "text"]);
  assert.ok(
    sql.some((statement) =>
      statement.includes('DELETE FROM voice_channels WHERE "guildId"'),
    ),
  );
});

test("permission errors preserve the room record", async () => {
  const { guild, sql, deleted } = fixture();
  mock.method(guild.channels, "fetch", async () => {
    throw Object.assign(new Error("Missing access"), { code: 50001 });
  });
  await assert.rejects(deleteEmptyRoom(guild, "voice"), /Missing access/);
  assert.deepEqual(deleted, []);
  assert.ok(!sql.some((statement) => statement.startsWith("DELETE")));
});

test("failed channel deletion retains database state", async () => {
  const { guild, sql } = fixture();
  mock.method(guild.channels, "fetch", async () => ({
    type: ChannelType.GuildVoice,
    delete: async () => {
      throw new Error("Missing permissions");
    },
  }));
  await assert.rejects(deleteEmptyRoom(guild, "voice"), /Missing permissions/);
  assert.ok(!sql.some((statement) => statement.startsWith("DELETE")));
});

test("unavailable gateway state prevents deletion", async () => {
  const { guild, sql } = fixture();
  mock.method(guild.client, "isReady", () => false);
  assert.equal(await deleteEmptyRoom(guild, "voice"), false);
  assert.deepEqual(sql, []);
});

test("only Discord Unknown Channel is treated as a missing channel", async () => {
  const { guild } = fixture();
  mock.method(guild.channels, "fetch", async () => {
    throw { code: 10003 };
  });
  assert.equal(await fetchChannel(guild, "voice"), null);
});

test("unrecognised channels are retained", async () => {
  const { guild, deleted } = fixture();
  mock.method(getPool(), "query", async () => ({ rows: [] }));
  assert.equal(await deleteEmptyRoom(guild, "unknown"), false);
  assert.deepEqual(deleted, []);
});

test("a bot joining after scheduling protects the room when the timer fires", async () => {
  const { guild, states, deleted } = fixture();
  mock.timers.enable({ apis: ["setTimeout"] });
  scheduleEmptyRoomDeletion(guild, "voice", 1);
  assert.equal(hasDeleteTimer("voice"), true);
  states.set("music-bot", { channelId: "voice", bot: true });
  mock.timers.tick(1000);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(deleted, []);
  mock.timers.reset();
});

test("ownership limits are per server even with an older higher configured limit", async () => {
  fixture();
  mock.method(getPool(), "query", async (sql: string, params: string[]) => ({
    rows: sql.includes("COUNT")
      ? [{ count: params[0] === "server-a" ? "1" : "0" }]
      : [],
  }));
  assert.equal(
    (await canCreateChannel("server-a", "owner", config)).allowed,
    false,
  );
  assert.equal(
    (await canCreateChannel("server-b", "owner", config)).allowed,
    true,
  );
});

test("panels show the owner's name and original creation date", () => {
  const createdAt = Date.UTC(2026, 8, 29, 17, 42);
  const embed = buildControlPanelEmbed(config, "Epildev", createdAt).toJSON();
  assert.equal(embed.footer?.text, "✧ Epildev's Voice");
  assert.equal(embed.timestamp, new Date(createdAt).toISOString());
});

test("recovery retains records when Discord cannot fetch a room", async () => {
  const { recoverGuild } = await import("../src/services/RecoveryService.js");
  const { guild, sql } = fixture();
  mock.method(guild.channels, "fetch", async () => {
    throw new Error("Temporary outage");
  });
  mock.method(console, "error", () => {});
  await recoverGuild(guild, config);
  assert.ok(!sql.some((statement) => statement.startsWith("DELETE")));
});

test("repair edits an old panel beyond the first message page", async () => {
  const { ensureRoomControlPanel } =
    await import("../src/services/ControlPanelService.js");
  fixture();
  let sends = 0;
  let edits = 0;
  let page = 0;
  const panel = {
    id: "original-panel",
    author: { id: "bot" },
    embeds: [{ title: "🎛 Voice Room Controls" }],
    edit: async (payload: {
      embeds: { toJSON: () => { footer?: { text: string } } }[];
    }) => {
      assert.equal(
        payload.embeds[0].toJSON().footer?.text,
        "✧ Epildev's Voice",
      );
      edits++;
    },
  };
  mock.method(getPool(), "query", async (statement: string) => ({
    rows: statement.startsWith("SELECT")
      ? [{ ...row, createdAt: 1790703738125 }]
      : [],
  }));
  const channel = {
    id: "text",
    guild: {
      id: "server-a",
      members: {
        fetch: async () => ({
          displayName: "Unrelated server nickname",
          user: { username: "epildev" },
        }),
      },
    },
    messages: {
      fetch: async () => {
        page++;
        if (page === 1)
          return new Collection(
            Array.from({ length: 100 }, (_, i) => [
              String(i),
              { id: String(i), author: { id: "user" }, embeds: [] },
            ]),
          );
        return new Collection([[panel.id, panel]]);
      },
    },
    send: async () => {
      sends++;
    },
  } as unknown as import("discord.js").TextChannel;
  assert.equal(await ensureRoomControlPanel(channel, config, "bot"), true);
  assert.equal(page, 2);
  assert.equal(edits, 1);
  assert.equal(sends, 0);
});
