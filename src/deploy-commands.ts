import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commands } from "./commands/definitions.js";

const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error("BOT_TOKEN and CLIENT_ID must be set.");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);

async function main(): Promise<void> {
  console.log("Deploying commands (global)...");
  const result = await rest.put(
    Routes.applicationCommands(clientId as string),
    {
      body: commands,
    },
  );
  console.log(
    `Deployed ${Array.isArray(result) ? result.length : 0} commands.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
