import "dotenv/config";

import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import { commands } from "./commands/definitions.js";
import { initDb, closeDb } from "./db/postgres.js";
import { getConfig, getGuildIds } from "./services/ConfigService.js";
import { recoverGuild } from "./services/RecoveryService.js";
import { registerVoiceStateUpdate } from "./events/voiceStateUpdate.js";
import { registerInteractionCreate } from "./events/interactionCreate.js";

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error("BOT_TOKEN is required.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

async function runRecovery(): Promise<void> {
  const guildIds = await getGuildIds();

  for (const guildId of guildIds) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) continue;

    const config = await getConfig(guildId);
    if (!config) continue;

    await recoverGuild(guild, config);
  }
}

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user?.tag}`);

  const clientId = client.user?.id;
  const token = process.env.BOT_TOKEN;
  if (clientId && token) {
    try {
      const rest = new REST({ version: "10" }).setToken(token);

      const result = await rest.put(Routes.applicationCommands(clientId), {
        body: commands,
      });
      console.log(
        `Commands deployed globally: ${Array.isArray(result) ? result.length : 0} commands`,
      );
    } catch (err) {
      console.error("Command deployment error:", err);
    }
  }

  try {
    await runRecovery();
    console.log("Startup recovery complete.");
  } catch (err) {
    console.error("Recovery error:", err);
  }
});

registerVoiceStateUpdate(client);
registerInteractionCreate(client);

async function main(): Promise<void> {
  await initDb();

  try {
    await client.login(token);
  } catch (err) {
    console.error("Login failed:", err);
    await closeDb();
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  await client.destroy();
  await closeDb();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await client.destroy();
  await closeDb();
  process.exit(0);
});

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
